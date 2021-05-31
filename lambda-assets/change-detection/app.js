const https = require('https')
const { S3 } = require('aws-sdk')

exports.handler = async(event) => {
  const targets = JSON.parse(process.env.TARGETS)
  const bucketName = process.env.BUCKET_NAME
  const result = {}
  try {
    for (const name in targets) {
      const target = targets[name]
      if (target.t === 'gf') {
        const url = `https://docs.google.com/forms/d/e/${target.k}/viewform`
        const response = await this._request(url)
        if (response.indexOf(url) === 241) {
          result[name] = {
            url: url,
            opened: true
          }
        } else {
          result[name] = {
            url: url,
            opened: false
          }
        }
      }
    }
    const s3Client = new S3()
    await s3Client.putObject({
      Bucket: bucketName,
      Key: 'vaccine.json',
      Body: JSON.stringify(result)
    }).promise()
  } catch(error) {
    console.error('Error', error)
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      created: true
    })
  }
}

exports._request = (url) => {
  return new Promise((resolve, reject) => {
    let result = ''
    https.get(url, (response) => {
      response.on('data', (data) => {
        result += data
      });
      response.on('end', () => {
        resolve(result)
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}