const { Firehose } = require('aws-sdk')
const line = require('@line/bot-sdk');
const intents = require('./intents')

const {
  CHANNEL_ACCESS_TOKEN,
  DELIVERY_STREAM_NAME
} = process.env

const triggerKeywords = {
  '公費疫苗': 'checkFreeFluVaccination',
  '訊息統計': 'getMessageStatistics',
  '測試': 'test',
}

exports.handler = async(event) => {
  console.log(event)
  const body = JSON.parse(event.body) || {}
  const [ lineEvent ] = body.events
  const lineMessage = lineEvent.message.text || ''
  const replyToken = lineEvent.replyToken
  let replyMessage = ''
  try {
    await this._record(lineEvent)
    for (const triggerKeyword in triggerKeywords) {
      if (lineMessage.indexOf(triggerKeyword) > -1 && typeof intents[triggerKeywords[triggerKeyword]] === 'function') {
        replyMessage = await intents[triggerKeywords[triggerKeyword]](lineMessage, lineEvent, replyToken)
        break
      }
    }
  } catch(error) {
    console.log(error)
    replyMessage = '哎呀！出錯了，好鄰居不計較啦～'
  }
  console.log(replyMessage)
  if (replyMessage !== '') {
    await this._replyMessage(replyMessage, replyToken)
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      processed: true
    })
  }
}

exports._record = (lineEvent) => {
  const firehoseClient = new Firehose()
  return firehoseClient.putRecord({
    DeliveryStreamName: DELIVERY_STREAM_NAME,
    Record: {
      Data: Buffer.from(
        `${JSON.stringify({
          'type': lineEvent.type,
          'message.type': lineEvent.message.type,
          'message.text': lineEvent.message.text,
          'timestamp': lineEvent.timestamp,
          'source.type': lineEvent.source.type,
          'source.groupId': lineEvent.source.groupId,
          'source.userId': lineEvent.source.userId,
          'mode': lineEvent.mode
        })}\n`
      )
    }
  }).promise()
}

exports._replyMessage = (replyMessage, replyToken) => {
  return new Promise((resolve, reject) => {
    const client = new line.Client({
      channelAccessToken: CHANNEL_ACCESS_TOKEN
    })
    client.replyMessage(replyToken, {
      type: 'text',
      text: replyMessage
    }).then(() => {
      resolve(true)
    }).catch((error) => {
      reject(error)
    })
  })
}