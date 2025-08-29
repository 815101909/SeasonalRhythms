Page({
  data: {
    appInfo: {
      name: '小舟摇风溪',
      version: 'v1.0.0',
      description: '小舟摇风溪是一款基于二十四节气的文化探索小程序，致力于传承和推广中国传统节气文化。通过城市漫游、知识竞答等互动形式，让用户在轻松愉悦的氛围中了解节气知识，感受传统文化的魅力。',
      features: [
        '二十四节气知识探索',
        '城市文化漫游体验',
        '节气知识竞答游戏',
        '小树收集与成长',
        '城市足迹记录'
      ],
      team: [
        {
          name: '何晓时',
          role: '产品负责人',
          email: 'xiaoxiaovision@foxmail.com'
        },
        {
          name: '刘时雨',
          role: '技术开发',
          email: 'xiaoxiaovision@foxmail.com'
        },
        {
          name: '张节气',
          role: '内容策划',
          email: 'xiaoxiaovision@foxmail.com'
        }
      ]
    }
  },

  copyEmail(e) {
    const email = e.currentTarget.dataset.email;
    wx.setClipboardData({
      data: email,
      success() {
        wx.showToast({
          title: '邮箱已复制',
          icon: 'success'
        });
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '小舟摇风溪 - 探索二十四节气文化',
      path: '/pages/cloudDwelling/index'
    };
  }
}) 
 
 
 
 
 
 