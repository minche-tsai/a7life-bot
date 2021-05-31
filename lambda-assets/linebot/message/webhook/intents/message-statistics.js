const { Athena, SQS } = require('aws-sdk')
const crypto = require('crypto')

const {
  DATABASE_NAME,
  TABLE_NAME,
  QUEUE_URL,
  PERIOD
} = process.env

module.exports = (lineMessage, lineEvent, replyToken) => {
  return new Promise(async(resolve, reject) => {
    try {
      const groupId = lineEvent.source.groupId
      if (!groupId) {
        return resolve('訊息統計功能只限於群組內使用')
      }
      const queryString = `
        SELECT "source.userid", COUNT("source.userid") AS "message.count"
        FROM "${DATABASE_NAME}"."${TABLE_NAME}"
        WHERE "source.groupid"='${groupId}'
        GROUP BY "source.userid"
        ORDER BY "message.count" DESC
        LIMIT 10
      `
      const period = (PERIOD > 1 ? PERIOD : 5) * 60 * 1000 // 1 minute ~ ? minutes
      const athenaClient = new Athena()
      const md5 = crypto.createHash('md5')
      const clientRequestToken = md5.update(`message-${Math.floor(Date.now() / period)}-1`).digest('hex')
      const params = {
        QueryString: queryString,
        ResultConfiguration: {
          OutputLocation: `s3://${process.env.BUCKET_NAME}/athena/`
        },
        ClientRequestToken: clientRequestToken,
      }
      const queryExecution = await athenaClient.startQueryExecution(params).promise()
      const sqsClient = new SQS()
      await sqsClient.sendMessage({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify({
          queryExecutionId: queryExecution.QueryExecutionId,
          groupId,
          replyToken,
          retries: 0
        }),
        DelaySeconds: 1,
      }).promise()
      resolve('')
    } catch(error) {
      reject(error)
    }
  })
}