const { S3 } = require('aws-sdk')

module.exports = (lineMessage) => {
  return new Promise(async(resolve, reject) => {
    try {
      const s3Client = new S3()
      const { Body: vaccineJson } = await s3Client.getObject({
        Bucket: process.env.BUCKET_NAME,
        Key: 'vaccine.json',
      }).promise()
      const targets = JSON.parse(`${vaccineJson}`)
      let replyMessage = ''
      if (lineMessage.indexOf('桃園市') > -1) {
        for (const targetKeyword in targets) {
          const target = targets[targetKeyword]
          if (target.opened) {
            replyMessage += `${targetKeyword}的公費疫苗已開放報名，報名網址: ${target.url}\n\n`
          } else {
            replyMessage += `${targetKeyword}的公費疫苗尚未開放報名，報名網址: ${target.url}\n\n`
          }
        }
        replyMessage += '更多資訊請上CDC https://www.cdc.gov.tw/Category/MPage/TsqW6AJKkdyE00eCPDSEYw'
      } else {
        for (const targetKeyword in targets) {
          if (lineMessage.indexOf(targetKeyword) > -1) {
            const target = targets[targetKeyword]
            if (target.opened) {
              replyMessage = `${targetKeyword}的公費疫苗已開放報名，報名網址: ${target.url}\n\n更多資訊請上CDC https://www.cdc.gov.tw/Category/MPage/TsqW6AJKkdyE00eCPDSEYw`
            } else {
              replyMessage = `${targetKeyword}的公費疫苗尚未開放報名，報名網址: ${target.url}\n\n更多資訊請上CDC https://www.cdc.gov.tw/Category/MPage/TsqW6AJKkdyE00eCPDSEYw`
            }
          }
        }
      }
      if (replyMessage === '') {
        replyMessage = `你要跟我說哪一區呀，目前支援${Object.keys(targets).join(', ')}`
      }
      resolve(replyMessage)
    } catch(error) {
      reject(error)
    }
  })
}