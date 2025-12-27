// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 获取当前时间戳（中国时区 UTC+8）
function getCurrentTimestamp() {
  // 直接使用当前时间戳，因为Date.now()本身就是UTC时间戳
  // 在比较时应该确保数据库中的unlockDate也是正确的时间戳
  return Date.now()
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const currentTimestamp = getCurrentTimestamp()
    
    // 查找需要解锁的漫游记录（unlockDate小于等于当前时间的）
    const result = await db.collection('cityCard')
      .where(db.command.and([
        db.command.or([
          { 'basicInfo.status': false },
          { 'basicInfo.status': db.command.exists(false) }  // 字段不存在或为undefined
        ]),
        { 'unlockDate': db.command.lte(currentTimestamp) }  // 解锁时间小于等于当前时间
      ]))
      .update({
        data: {
          'basicInfo.status': true,
          updatedAt: db.serverDate()
        }
      })

    console.log('解锁漫游记结果:', result)
    console.log('成功更新的记录数量:', result.stats.updated)

    return {
      success: true,
      data: {
        updated: result.stats.updated
      }
    }
  } catch (error) {
    console.error('解锁漫游记失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 