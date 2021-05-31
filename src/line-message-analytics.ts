import * as glue from '@aws-cdk/aws-glue';
import * as iam from '@aws-cdk/aws-iam';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import * as s3 from '@aws-cdk/aws-s3';
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';

interface LineMessageAnalyticsProps {
  readonly bucket: s3.Bucket;
  readonly statisticsDatabase: glue.Database;
  readonly statisticsTable: glue.Table;
  readonly statisticsResultQueue: sqs.Queue;
  readonly channelAccessToken: string;
}

export class LineMessageAnalytics extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: LineMessageAnalyticsProps) {
    super(scope, id);
    this._createQueryResultFunction(props);
    this._createTestFunction(props);
  }
  _createTestFunction(props: LineMessageAnalyticsProps) {
    const testFunctionRole = new iam.Role(this, 'TestFunctionRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
      ),
    });
    testFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:ListBucket',
        ],
        resources: [
          props.bucket.bucketArn,
        ],
      }),
    );
    testFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
        ],
        resources: [
          `${props.bucket.bucketArn}/line-messages2021/*`,
        ],
      }),
    );
    testFunctionRole.addToPolicy(
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
    testFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
        ],
        resources: ['*'],
      }),
    );
    testFunctionRole.addToPolicy(
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
    testFunctionRole.addToPolicy(
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
    new lambda.NodejsFunction(this, 'TestFunction', {
      entry: `${process.env.LAMBDA_ASSETS_PATH}/test/app.js`,
      role: testFunctionRole,
      timeout: cdk.Duration.seconds(5),
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
        CHANNEL_ACCESS_TOKEN: props.channelAccessToken,
        GROUP_ID: 'C45a8bb9788dc113a0c117946bfcdc9ab',
        DATABASE_NAME: props.statisticsDatabase.databaseName,
        TABLE_NAME: props.statisticsTable.tableName,
      },
    });
  }
  _createQueryResultFunction(props: LineMessageAnalyticsProps) {
    const queryStatisticsResultFunctionRole = new iam.Role(this, 'QueryStatisticsResultFunctionRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
      ),
    });
    queryStatisticsResultFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:ListBucket',
        ],
        resources: [
          props.bucket.bucketArn,
        ],
      }),
    );
    queryStatisticsResultFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
        ],
        resources: [
          `${props.bucket.bucketArn}/line-messages2021/*`,
        ],
      }),
    );
    queryStatisticsResultFunctionRole.addToPolicy(
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
    queryStatisticsResultFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
        ],
        resources: ['*'],
      }),
    );
    queryStatisticsResultFunctionRole.addToPolicy(
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
    queryStatisticsResultFunctionRole.addToPolicy(
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
    const queryStatisticsResultFunction = new lambda.NodejsFunction(this, 'QueryStatisticsResultFunction', {
      entry: `${process.env.LAMBDA_ASSETS_PATH}/linebot/message/query-statistics-result/app.js`,
      role: queryStatisticsResultFunctionRole,
      timeout: cdk.Duration.seconds(5),
      environment: {
        CHANNEL_ACCESS_TOKEN: props.channelAccessToken,
        QUEUE_URL: props.statisticsResultQueue.queueUrl,
      },
    });
    queryStatisticsResultFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(props.statisticsResultQueue, {
        batchSize: 1,
      }),
    );
  }
}