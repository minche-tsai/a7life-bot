const { AwsCdkTypeScriptApp } = require('projen');

const project = new AwsCdkTypeScriptApp({
  cdkVersion: '1.106.1',
  defaultReleaseBranch: 'main',
  jsiiFqn: 'projen.AwsCdkTypeScriptApp',
  name: 'change-detection',
  cdkDependencies: [
    '@aws-cdk/core',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-lambda-nodejs',
    '@aws-cdk/aws-lambda-event-sources',
    '@aws-cdk/aws-events',
    '@aws-cdk/aws-events-targets',
    '@aws-cdk/aws-sqs',
    '@aws-cdk/aws-s3',
    '@aws-cdk/aws-kinesisfirehose',
    '@aws-cdk/aws-glue',
  ],
  deps: [
    'aws-sdk',
    'sccdk-restapi',
    'dotenv',
    '@line/bot-sdk',
  ],
});

project.synth();
