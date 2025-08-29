// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, type, data } = event
  
  try {
    switch (action) {
      case 'getChapters':
        // 获取博物馆章节
        const chapters = await db.collection('museum_chapters')
          .where({
            type: type // 'city' 或 'season'
          })
          .orderBy('order', 'asc')
          .field({
            chapter_id: true,
            name: true,
            type: true,
            order: true,
            cover_image: true
          })
          .get()
        
        console.log('获取到的章节数据:', chapters.data) // 添加日志
        
        return {
          success: true,
          data: chapters.data
        }

      case 'getChapterDetail':
        // 获取章节详情
        const { chapter_id } = data
        const chapterCollection = data.collection || 'museum_chapters'
        if (!chapter_id) {
          return {
            success: false,
            error: '缺少章节ID'
          }
        }

        const chapterDetail = await db.collection(chapterCollection)
          .where({
            chapter_id: chapter_id
          })
          .get()

        if (chapterDetail.data.length === 0) {
          return {
            success: false,
            error: '章节不存在'
          }
        }

        return {
          success: true,
          data: chapterDetail.data[0]
        }

      case 'getTimeMuseumAreas':
        // 获取晓时博物馆展区列表
        const areas = await db.collection('museum_areas')
          .orderBy('order', 'asc')
          .get()

        return {
          success: true,
          data: areas.data
        }

      case 'getSeasonAreas':
        // 获取节气展区列表
        const seasonAreas = await db.collection('season')
          .orderBy('order', 'asc')
          .get()

        return {
          success: true,
          data: seasonAreas.data
        }

      case 'getSeasonDetail':
        // 获取季节详情
        const { season_id } = data;
        if (!season_id) {
          return {
            success: false,
            error: '缺少季节ID'
          }
        }

        const seasonDetail = await db.collection('museum_seasons')
          .where({
            season_id: season_id
          })
          .get();

        if (seasonDetail.data.length === 0) {
          return {
            success: false,
            error: '季节不存在'
          }
        }

        return {
          success: true,
          data: seasonDetail.data[0]
        }

      case 'getAreaDetail':
        // 获取展区详情
        const { area_id } = data
        const areaCollection = data.collection || 'museum_areas'
        if (!area_id) {
          return {
            success: false,
            error: '缺少展区ID'
          }
        }

        const areaDetail = await db.collection(areaCollection)
          .where({
            area_id: area_id
          })
          .get()

        if (areaDetail.data.length === 0) {
          return {
            success: false,
            error: '展区不存在'
          }
        }

        return {
          success: true,
          data: areaDetail.data[0]
        }

      case 'getCityPoetry':
        // 获取诗画古城数据
        const { cityName, page = 1, pageSize = 10 } = data
        let query = db.collection('poetry')
        
        if (cityName) {
          query = query.where({
            city: cityName
          })
        }
        
        const poetryList = await query
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get()
          
        // 获取总数
        const total = await db.collection('poetry').count()
        
        return {
          success: true,
          data: {
            list: poetryList.data,
            total: total.total,
            page,
            pageSize
          }
        }

      case 'addCityPoetry':
        // 添加诗画古城数据
        const poetryData = data
        const { verse, dynasty, city, poet, title } = poetryData
        
        if (!verse || !dynasty || !city || !poet || !title) {
          return {
            success: false,
            error: '缺少必要字段'
          }
        }
        
        const result = await db.collection('poetry').add({
          data: {
            ...poetryData,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
        
        return {
          success: true,
          data: result._id
        }

      case 'updateCityPoetry':
        // 更新诗画古城数据
        const { _id, ...updateData } = data
        
        if (!_id) {
          return {
            success: false,
            error: '缺少ID'
          }
        }
        
        await db.collection('poetry').doc(_id).update({
          data: {
            ...updateData,
            updateTime: db.serverDate()
          }
        })
        
        return {
          success: true
        }
        
      default:
        return {
          success: false,
          error: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('[云函数] [museum] 调用失败：', error)
    return {
      success: false,
      error: error.message
    }
  }
}