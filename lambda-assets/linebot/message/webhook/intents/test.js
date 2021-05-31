module.exports = (lineMessage) => {
  return new Promise(async(resolve, reject) => {
    try {
      replyMessage = '@MinChe Tsai (莫小米) Tag test'
      resolve(replyMessage)
    } catch(error) {
      reject(error)
    }
  })
}