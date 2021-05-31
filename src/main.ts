import * as path from 'path';
import * as s3 from '@aws-cdk/aws-s3';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import * as dotenv from 'dotenv';
import { ChangeDetectionEvent } from './change-detection-event';
import { LineMessage } from './line-message';
import { LineMessageAnalytics } from './line-message-analytics';
import { LineMessageApi } from './line-message-api';

dotenv.config();

process.env.LAMBDA_ASSETS_PATH = path.resolve(__dirname, '../lambda-assets');

export class ChangeDetectionStack extends Stack {

  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);
    this.bucket = this._createBucket();
    new ChangeDetectionEvent(this, 'ChangeDetectionEvent', {
      bucket: this.bucket,
    });
    // LineMessage Main Construct
    const lineMessage = new LineMessage(this, 'LineMessage', {
      bucket: this.bucket,
    });
    // LineMessage API Construct
    new LineMessageApi(this, 'LineMessageApi', {
      bucket: this.bucket,
      deliveryStream: lineMessage.deliveryStream,
      statisticsDatabase: lineMessage.statisticsDatabase,
      statisticsTable: lineMessage.statisticsTable,
      statisticsResultQueue: lineMessage.statisticsResultQueue,
      channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN ?? '',
    });
    // LineMessage Analytics Construct
    new LineMessageAnalytics(this, 'LineMessageAnalytics', {
      bucket: this.bucket,
      statisticsResultQueue: lineMessage.statisticsResultQueue,
      statisticsDatabase: lineMessage.statisticsDatabase,
      statisticsTable: lineMessage.statisticsTable,
      channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN ?? '',
    });
  }
  _createBucket(): s3.Bucket {
    return new s3.Bucket(this, 'DataBucket');
  }
}

const app = new App();

new ChangeDetectionStack(app, 'A7LifeLineBotStack', {
  env: {
    account: process.env.AWS_ACCOUNT,
    region: process.env.AWS_REGION,
  },
});

app.synth();