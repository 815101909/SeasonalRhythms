// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-1gsyt78b92c539ef' // 请替换为您的云环境ID
})

const db = cloud.database()
const cityCardsCollection = db.collection('cityCard')
const monthlyCarouselCollection = db.collection('monthlyCarousel')
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, cityName, year, month } = event

  switch (action) {
    case 'getCityCard':
      return await getCityCard(cityName)
    case 'getAllCityCards':
      return await getAllCityCards(year, month)
    case 'initMonthlyCarousel':
      return await initMonthlyCarousel()
    case 'updateMonthlyCarousel':
      return await updateMonthlyCarousel(event.data)
    case 'getMonthlyCarousel':
      return await getMonthlyCarousel()
    default:
      return {
        success: false,
        message: '未知的操作类型'
      }
  }
}

// 获取指定城市的卡片信息
async function getCityCard(cityName) {
  try {
    console.log('获取城市卡片数据，城市名称:', cityName);
    
    const result = await cityCardsCollection
      .where({
      'basicInfo.cityName': cityName
      })
      .get();

    console.log('查询结果:', result);

    if (result.data.length === 0) {
      return {
        success: false,
        message: '未找到该城市卡片'
      }
    }

    return {
      success: true,
      data: result.data[0]
    }
  } catch (error) {
    console.error('获取城市卡片失败:', error);
    return {
      success: false,
      message: error.message
    }
  }
}

// 获取指定年月的城市卡片列表
async function getAllCityCards(year = new Date().getFullYear(), month = new Date().getMonth() + 1) {
  try {
    console.log('接收到的参数:', { year, month });

    // 构建日期范围的时间戳（考虑时区影响）
    const startDate = new Date(Date.UTC(year, month - 1, 1, -8, 0, 0, 0)).getTime();  // 减8小时，确保是当地时间的0点
    const endDate = new Date(Date.UTC(year, month, 0, 15, 59, 59, 999)).getTime();    // 加16小时，确保包含最后一天

    console.log('查询条件:', {
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      startTimestamp: startDate,
      endTimestamp: endDate
    });

    // 先查询所有数据，看看数据库中有什么
    const allData = await cityCardsCollection.get();
    console.log('数据库中的所有数据:', allData.data.map(item => ({
      cityName: item.basicInfo.cityName,
      unlockDate: item.basicInfo.unlockDate,
      unlockDateStr: new Date(item.basicInfo.unlockDate).toISOString()
    })));

    const result = await cityCardsCollection
      .where({
        'basicInfo.unlockDate': _.gte(startDate).and(_.lte(endDate))
      })
      .get()

    console.log('查询结果:', {
      success: true,
      data: result.data,
      count: result.data.length
    });

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('获取城市卡片失败:', error);
    return {
      success: false,
      message: error.message
    }
  }
} 

// 初始化月份轮播图集合
async function initMonthlyCarousel() {
  try {
    // 检查集合是否存在
    const collections = await db.listCollections().get()
    const collectionNames = collections.data.map(collection => collection.name)
    
    if (!collectionNames.includes('monthlyCarousel')) {
      await db.createCollection('monthlyCarousel')
    }
    
    // 获取现有数据
    const existingData = await monthlyCarouselCollection.count()
    
    // 如果集合为空，添加默认数据
    if (existingData.total === 0) {
      const defaultCarousels = [
        {
          month: 1,
          caption: "一月·雪后初霁的北方山脉",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/january.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 2,
          caption: "二月·早春江南的细雨绵绵",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/february.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 3,
          caption: "三月·山野间绽放的春日花朵",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/march.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 4,
          caption: "四月·樱花飞舞的湖畔小径",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/april.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 5,
          caption: "五月·初夏时节的青翠山林",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/may.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 6,
          caption: "六月·夏至日落的金色田野",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/june.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 7,
          caption: "七月·荷花盛开的宁静湖泊",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/july.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 8,
          caption: "八月·夏末山间的清凉溪流",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/august.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 9,
          caption: "九月·稻田丰收的金黄季节",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/september.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 10,
          caption: "十月·秋叶缤纷的山林小道",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/october.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 11,
          caption: "十一月·晚秋雾霭中的湖光山色",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/november.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        },
        {
          month: 12,
          caption: "十二月·冬日雪景中的松柏常青",
          imageUrl: "cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/carousel/december.jpg",
          createBy: "SYSTEM",
          createdAt: Date.now(),
          updateBy: "SYSTEM",
          updatedAt: Date.now()
        }
      ]
      
      // 批量添加默认数据
      for (const carousel of defaultCarousels) {
        await monthlyCarouselCollection.add({
          data: carousel
        })
      }
    }
    
    return {
      success: true,
      message: '月份轮播图集合初始化成功'
    }
  } catch (error) {
    console.error('初始化月份轮播图集合失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 更新月份轮播图数据
async function updateMonthlyCarousel(data) {
  try {
    const { month, caption, imageUrl } = data
    
    if (!month || month < 1 || month > 12) {
      return {
        success: false,
        message: '月份参数无效'
      }
    }
    
    // 查找是否已存在该月份的数据
    const existingData = await monthlyCarouselCollection
      .where({ month: month })
      .get()
    
    const now = Date.now()
    const wxContext = cloud.getWXContext();
    const userOpenid = wxContext.FROM_OPENID || wxContext.OPENID;
    const updateData = {
      caption,
      imageUrl,
      updateBy: userOpenid,
      updatedAt: now
    }
    
    if (existingData.data.length > 0) {
      // 更新现有数据
      await monthlyCarouselCollection.doc(existingData.data[0]._id).update({
        data: updateData
      })
    } else {
      // 添加新数据
      await monthlyCarouselCollection.add({
        data: {
          month,
          ...updateData,
          createBy: userOpenid,
          createdAt: now
        }
      })
    }
    
    return {
      success: true,
      message: '月份轮播图更新成功'
    }
  } catch (error) {
    console.error('更新月份轮播图失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
} 

// 获取月份轮播图数据
async function getMonthlyCarousel() {
  try {
    console.log('开始获取月份轮播图数据');
    
    // 获取所有月份的轮播图数据
    const result = await monthlyCarouselCollection
      .orderBy('month', 'asc')
      .get();
    
    console.log('查询结果:', result);
    
    if (!result.data || result.data.length === 0) {
      console.log('数据库中没有轮播图数据，尝试初始化');
      // 如果没有数据，先初始化
      const initResult = await initMonthlyCarousel();
      if (!initResult.success) {
        return {
          success: false,
          message: '初始化轮播图数据失败'
        };
      }
      // 再次获取数据
      const retryResult = await monthlyCarouselCollection
        .orderBy('month', 'asc')
        .get();
      
      return {
        success: true,
        data: retryResult.data
      };
    }
    
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('获取月份轮播图数据失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
}