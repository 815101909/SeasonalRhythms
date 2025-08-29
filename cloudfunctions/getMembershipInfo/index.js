const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, days, treeCost } = event;
  const { FROM_OPENID } = cloud.getWXContext();

  try {
    // 如果没有指定操作类型，默认获取会员信息
    if (!action || action === 'getMembershipInfo') {
      const res = await db.collection('membershipInfo').orderBy('id', 'asc').get();
      return {
        code: 0,
        data: res.data,
        msg: '获取会员信息成功'
      };
    }

    // 兑换会员功能
    if (action === 'exchangeMembership') {
      if (!days || !treeCost) {
        return {
          code: -1,
          data: null,
          msg: '参数不完整'
        };
      }

      // 获取用户当前信息
       const userRes = await db.collection('xsj_users').where({
         openid: FROM_OPENID
       }).get();

       if (userRes.data.length === 0) {
         return {
           code: -1,
           data: null,
           msg: '用户不存在'
         };
       }

       const user = userRes.data[0];
       
       // 检查树苗数量是否足够
       if (user.treeCount < treeCost) {
         return {
           code: -1,
           data: null,
           msg: '树苗数量不足'
         };
       }

       // 计算新的会员到期时间（使用时间戳，与 xsj_pay 保持一致）
       let memberExpireTime = Date.now();
       
       if (user.isVIP && user.memberExpireTime && user.memberExpireTime > Date.now()) {
         // 如果当前是VIP且未过期，在现有时间基础上延长
         memberExpireTime = user.memberExpireTime;
       }
       
       // 创建Date对象用于计算，保持memberExpireTime变量为时间戳
       const calculatedMemberDate = new Date(memberExpireTime);
       calculatedMemberDate.setDate(calculatedMemberDate.getDate() + days);
       memberExpireTime = calculatedMemberDate.getTime();

       // 更新用户信息
       const updateRes = await db.collection('xsj_users').where({
         openid: FROM_OPENID
       }).update({
         data: {
           treeCount: _.inc(-treeCost), // 减少树苗数量
           consumedTrees: _.inc(treeCost), // 增加消耗的树苗数量
           isVIP: true,
           memberExpireTime: memberExpireTime,
           updateTime: db.serverDate()
         }
       });

      if (updateRes.stats.updated === 0) {
        return {
          code: -1,
          data: null,
          msg: '更新用户信息失败'
        };
      }

      return {
         code: 0,
         data: {
           newTreeCount: user.treeCount - treeCost,
           newConsumedTrees: (user.consumedTrees || 0) + treeCost,
           isVIP: true,
           memberExpireTime: memberExpireTime,
           exchangedDays: days
         },
         msg: `成功兑换${days}天会员`
       };
    }

    return {
      code: -1,
      data: null,
      msg: '未知操作类型'
    };

  } catch (e) {
    return {
      code: -1,
      data: null,
      msg: `操作失败: ${e.message}`
    };
  }
};