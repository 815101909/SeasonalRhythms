// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  
  // 统一获取openid，优先使用FROM_OPENID（跨小程序调用时的openid），如果没有则使用OPENID
  const userOpenid = wxContext.FROM_OPENID || wxContext.OPENID

  try {
    switch (action) {
      case 'recordUnlock':
        return await recordUnlock(data, userOpenid)
      case 'getUnlockedItems':
        return await getUnlockedItems(userOpenid)
      default:
        return {
          success: false,
          message: '未知操作类型'
        }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      message: '服务器错误',
      error: error.message
    }
  }
}

// 记录解锁信息
async function recordUnlock(data, openid) {
  const { chapter_id, area_id } = data
  
  if (!chapter_id && !area_id) {
    return {
      success: false,
      message: '必须提供chapter_id或area_id'
    }
  }
  
  try {
    // 检查是否已经记录过
    const query = {
      openid: openid
    }
    
    if (chapter_id) {
      query.chapter_id = chapter_id
    }
    
    if (area_id) {
      query.area_id = area_id
    }
    
    const existingRecord = await db.collection('unlocked_chapters').where(query).get()
    
    if (existingRecord.data.length > 0) {
      return {
        success: true,
        message: '已经记录过该解锁信息',
        data: existingRecord.data[0]
      }
    }
    
    // 创建新的解锁记录
    const unlockRecord = {
      openid: openid,
      date: db.serverDate(),
      create_time: db.serverDate()
    }
    
    if (chapter_id) {
      unlockRecord.chapter_id = chapter_id
    }
    
    if (area_id) {
      unlockRecord.area_id = area_id
    }
    
    const result = await db.collection('unlocked_chapters').add({
      data: unlockRecord
    })
    
    return {
      success: true,
      message: '解锁记录创建成功',
      data: {
        _id: result._id,
        ...unlockRecord
      }
    }
  } catch (error) {
    console.error('记录解锁信息错误:', error)
    return {
      success: false,
      message: '记录解锁信息失败',
      error: error.message
    }
  }
}

// 获取用户的解锁信息
async function getUnlockedItems(openid) {
  try {
    const result = await db.collection('unlocked_chapters')
      .where({
        openid: openid
      })
      .orderBy('date', 'desc')
      .get()
    
    const unlockedChapters = []
    const unlockedAreas = []
    
    result.data.forEach(item => {
      if (item.chapter_id) {
        unlockedChapters.push(item.chapter_id)
      }
      if (item.area_id) {
        unlockedAreas.push(item.area_id)
      }
    })
    
    return {
      success: true,
      data: {
        unlockedChapters: unlockedChapters,
        unlockedAreas: unlockedAreas,
        records: result.data
      }
    }
  } catch (error) {
    console.error('获取解锁信息错误:', error)
    return {
      success: false,
      message: '获取解锁信息失败',
      error: error.message
    }
  }
}