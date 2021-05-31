import * as glue from '@aws-cdk/aws-glue';
import * as iam from '@aws-cdk/aws-iam';
import * as firehose from '@aws-cdk/aws-kinesisfirehose';
import * as s3 from '@aws-cdk/aws-s3';
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';

interface LineMessageProps {
  readonly bucket: s3.Bucket;
}

export class LineMessage extends cdk.Construct {

  public readonly deliveryStream: firehose.CfnDeliveryStream;

  public readonly statisticsDatabase: glue.Database;

  public readonly statisticsTable: glue.Table;

  public readonly statisticsResultQueue: sqs.Queue;

  constructor(scope: cdk.Construct, id: string, props: LineMessageProps) {
    super(scope, id);
    this.statisticsDatabase = this._createStatisticsDatabase(props);
    this.statisticsTable = this._createStatisticsTable(props);
    this.statisticsResultQueue = this._createStatisticsResultQueue();
    this.deliveryStream = this._createdeliveryStream(props);
  }
  _createdeliveryStream(props: LineMessageProps): firehose.CfnDeliveryStream {
    const deliveryStreamRole = new iam.Role(this, 'deliveryStreamRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('firehose.amazonaws.com'),
      ),
    });
    deliveryStreamRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:AbortMultipartUpload',
          's3:GetBucketLocation',
          's3:GetObject',
          's3:ListBucket',
          's3:ListBucketMultipartUploads',
          's3:PutObject',
        ],
        resources: [`${props.bucket.bucketArn}/*`],
      }),
    );
    deliveryStreamRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'Logs:CreateLogGroup',
          'Logs:CreateLogStream',
          'Logs:PutLogEvents',
        ],
        resources: ['*'],
      }),
    );
    return new firehose.CfnDeliveryStream(this, 'deliveryStream', {
      deliveryStreamType: 'DirectPut',
      extendedS3DestinationConfiguration: {
        roleArn: deliveryStreamRole.roleArn,
        bucketArn: props.bucket.bucketArn,
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 3,
        },
        compressionFormat: 'UNCOMPRESSED',
        prefix: 'line-messages',
      },
    });
  }
  _createStatisticsDatabase(props: LineMessageProps) {
    return new glue.Database(this, 'LineMessageDatabase', {
      databaseName: 'line-message',
      locationUri: `s3://${props.bucket.bucketName}/`,
    });
  }
  _createStatisticsTable(props: LineMessageProps) {
    return new glue.Table(this, 'LineMessage2021Table', {
      tableName: 'line-message-2021',
      database: this.statisticsDatabase,
      bucket: props.bucket,
      s3Prefix: 'line-messages2021',
      dataFormat: glue.DataFormat.JSON,
      columns: [
        {
          name: 'type',
          type: glue.Schema.STRING,
        },
        {
          name: 'message.type',
          type: glue.Schema.STRING,
        },
        {
          name: 'message.text',
          type: glue.Schema.STRING,
        },
        {
          name: 'timestamp',
          type: glue.Schema.TIMESTAMP,
        },
        {
          name: 'source.type',
          type: glue.Schema.STRING,
        },
        {
          name: 'source.groupId',
          type: glue.Schema.STRING,
        },
        {
          name: 'source.userId',
          type: glue.Schema.STRING,
        },
        {
          name: 'mode',
          type: glue.Schema.STRING,
        },
      ],
    });
  }
  _createStatisticsResultQueue(): sqs.Queue {
    return new sqs.Queue(this, 'statisticsResultQueue', {});
  }
}