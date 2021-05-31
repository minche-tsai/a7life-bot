import * as events from '@aws-cdk/aws-events';
import * as eventTargets from '@aws-cdk/aws-events-targets';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as define from './define.json';

interface ChangeDetectionEventProps {
  readonly bucket: s3.Bucket;
}

export class ChangeDetectionEvent extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ChangeDetectionEventProps) {
    super(scope, id);
    new events.Rule(this, 'Schedule', {
      schedule: events.Schedule.rate(
        cdk.Duration.minutes(1),
      ),
      targets: [
        new eventTargets.LambdaFunction(
          this._createEventFunction(props),
        ),
      ],
    });
  }
  _createEventFunction(props: ChangeDetectionEventProps): lambda.NodejsFunction {
    const changeDetectionRole = new iam.Role(this, 'ChangeDetectionFunctionRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
      ),
    });
    changeDetectionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
        ],
        resources: [
          `${props.bucket.bucketArn}/*`,
        ],
      }),
    );
    changeDetectionRole.addToPolicy(
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
    const { ChangeDetection: targets } = define;
    return new lambda.NodejsFunction(this, 'ChangeDetectionFunction', {
      entry: `${process.env.LAMBDA_ASSETS_PATH}/change-detection/app.js`,
      role: changeDetectionRole,
      timeout: cdk.Duration.seconds(10),
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
        TARGETS: JSON.stringify(targets),
      },
    });
  }
}