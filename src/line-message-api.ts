import * as glue from '@aws-cdk/aws-glue';
import * as iam from '@aws-cdk/aws-iam';
import * as firehose from '@aws-cdk/aws-kinesisfirehose';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import * as s3 from '@aws-cdk/aws-s3';
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import { RestApi, HttpMethod } from 'sccdk-restapi';

interface LineMessageApiProps {
  readonly bucket: s3.Bucket;
  readonly deliveryStream: firehose.CfnDeliveryStream;
  readonly statisticsDatabase: glue.Database;
  readonly statisticsTable: glue.Table;
  readonly statisticsResultQueue: sqs.Queue;
  readonly channelAccessToken: string;
}

export class LineMessageApi extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: LineMessageApiProps) {
    super(scope, id);
    new RestApi(this, 'RestApi', {
      resources: [
        {
          path: '/line/message/webhook',
          httpMethod: HttpMethod.POST,
          lambdaFunction: this._createWebhookFunction(props),
        },
      ],
    });
  }
  _createWebhookFunction(props: LineMessageApiProps): lambda.NodejsFunction {
    const webhookFunctionRole = new iam.Role(this, 'WebhookFunctionRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
      ),
    });
    webhookFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetBucketLocation',
          's3:GetObject',
          's3:ListBucket',
          's3:ListBucketMultipartUploads',
          's3:AbortMultipartUpload',
          's3:PutObject',
          's3:ListMultipartUploadParts',
        ],
        resources: [
          `${props.bucket.bucketArn}`,
          `${props.bucket.bucketArn}/*`,
        ],
      }),
    );
    webhookFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sqs:SendMessage',
        ],
        resources: [
          props.statisticsResultQueue.queueArn,
        ],
      }),
    );
    webhookFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'athena:StartQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'glue:GetTable',
        ],
        resources: ['*'],
      }),
    );
    webhookFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'firehose:PutRecord',
          'firehose:PutRecordBatch',
        ],
        resources: [
          props.deliveryStream.attrArn,
        ],
      }),
    );
    webhookFunctionRole.addToPolicy(
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
    return new lambda.NodejsFunction(this, 'WebhookFunction', {
      entry: `${process.env.LAMBDA_ASSETS_PATH}/linebot/message/webhook/app.js`,
      role: webhookFunctionRole,
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
        CHANNEL_ACCESS_TOKEN: props.channelAccessToken,
        DELIVERY_STREAM_NAME: props.deliveryStream.ref,
        DATABASE_NAME: props.statisticsDatabase.databaseName,
        TABLE_NAME: props.statisticsTable.tableName,
        QUEUE_URL: props.statisticsResultQueue.queueUrl,
      },
    });
  }
}