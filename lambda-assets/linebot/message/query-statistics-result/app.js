const line = require('@line/bot-sdk');
const { Athena, SQS } = require('aws-sdk')

const {
  CHANNEL_ACCESS_TOKEN,
  QUEUE_URL
} = process.env

const lineClient = new line.Client({
  channelAccessToken: CHANNEL_ACCESS_TOKEN
})

exports.handler = async(event) => {
  console.log(JSON.stringify(event, null, 2))
  const [ record ] = event.Records || []
  const body = JSON.parse(record.body || '{}')
  const { queryExecutionId, groupId, replyToken, retries } = body
  if (retries >= 3) {
    console.log(`Retries ${retries}, return failed`)
    return true
  }
  try {
    console.log('retries:', retries)
    const startedAt = Date.now()
    const athenaClient = new Athena()
    const { QueryExecution: queryExecution } = await athenaClient.getQueryExecution({
      QueryExecutionId: queryExecutionId
    }).promise()
    const { Status: { State: queryExecutionState } } = queryExecution
    if (queryExecutionState === 'RUNNING') {
      this._retry({
        queryExecutionId: queryExecutionId,
        replyToken,
        retries: retries + 1
      })
      return
    }
    const { ResultSet: { Rows: rows } } = await athenaClient.getQueryResults({
      QueryExecutionId: queryExecutionId
    }).promise()
    const scores = []
    for (const { Data: row } of rows.slice(1)) {
      const [ { VarCharValue: userId }, { VarCharValue: messageCount } ] = row
      const member = await this._getMemberProfile(groupId, userId)
      scores.push({
        member: member.displayName,
        messageCount: messageCount
      })
    }
    const endedAt = Date.now()
    const replyMessage = scores.map(score => {
      return `${score.member} 發言次數: ${score.messageCount}\n`
    }).join('').concat(`\n統計花費時間: ${Math.round((endedAt - startedAt) / 1000, 2)}秒`)
    console.log(scores)
    console.log(endedAt - startedAt)
    console.log(replyMessage)
    await this._replyMessage(replyMessage, replyToken)
  } catch(error) {
    console.log(error)
    await this._replyMessage('哎呀，出錯了！', replyToken)
  }
};

exports._retry = async(body, delaySeconds = 3) => {
  const sqsClient = new SQS()
  await sqsClient.sendMessage({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(body),
    DelaySeconds: delaySeconds
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

exports._getMemberProfile = (groupId, userId) => {
  return new Promise((resolve, reject) => {
    lineClient.getGroupMemberProfile(groupId, userId).then(result => {
      resolve(result)
    }).catch(error => {
      resolve(null)
    })
  })
}