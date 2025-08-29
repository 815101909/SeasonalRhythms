// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { questionSetId } = event;
    
    // 查询指定日期的 PK 结果
    const result = await db.collection('pk_results')
      .where({
        questionSetId: questionSetId
      })
      .get();

    console.log('获取到的 PK 结果:', result.data);

    if (result.data && result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      };
    } else {
      return {
        success: false,
        error: '未找到指定日期的 PK 结果'
      };
    }
  } catch (error) {
    console.error('获取 PK 结果失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 