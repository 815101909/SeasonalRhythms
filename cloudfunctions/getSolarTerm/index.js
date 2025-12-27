// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取当前日期
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    const years = [currentYear - 1, currentYear, currentYear + 1]
    const { data: raw } = await db.collection('solar_terms')
      .where({ year: _.in(years) })
      .orderBy('year', 'asc')
      .get()

    const solarTerms = (raw || []).sort((a, b) => {
      if ((a.year || 0) !== (b.year || 0)) return (a.year || 0) - (b.year || 0)
      if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0)
      return (a.day || 0) - (b.day || 0)
    })

    // 返回节气数据
    return {
      success: true,
      data: {
        currentYear,
        currentMonth,
        currentDay,
        solarTerms
      }
    }

  } catch (error) {
    console.error('获取节气数据失败：', error)
    return {
      success: false,
      error: error.message
    }
  }
}