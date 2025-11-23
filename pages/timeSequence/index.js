// 时序经纬页面逻辑
const app = getApp();

// 工具函数：判断是否为闰年
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// 工具函数：获取指定年月的天数
function getDaysInMonth(year, month) {
  // month 是 1-12
  const daysInMonth = [
    31, // 一月
    isLeapYear(year) ? 29 : 28, // 二月，闰年29天，平年28天
    31, // 三月
    30, // 四月
    31, // 五月
    30, // 六月
    31, // 七月
    31, // 八月
    30, // 九月
    31, // 十月
    30, // 十一月
    31  // 十二月
  ];
  
  return daysInMonth[month - 1];
}

// 根据月份确定季节样式
function getSeasonStyle(month) {
  // 冬季：12月、1月、2月
  if (month === 12 || month === 1 || month === 2) {
    return {
      season: 'winter',
      bgColor: '#e3f2fd', // 最浅的玛雅蓝色
      emoji: ['❄️', '⛄'][Math.floor(Math.random() * 2)] // 雪花或雪人
    };
  }
  // 春季：3月、4月、5月
  else if (month >= 3 && month <= 5) {
    return {
      season: 'spring',
      bgColor: '#fff0f5', // 更浅的粉色
      emoji: ['☁️', '🍃'][Math.floor(Math.random() * 2)] // 云朵或树叶
    };
  }
  // 夏季：6月、7月、8月
  else if (month >= 6 && month <= 8) {
    return {
      season: 'summer',
      bgColor: '#e8f5e9', // 最浅绿色
      emoji: ['🌿', '🌱'][Math.floor(Math.random() * 2)] // 叶子或发芽
    };
  }
  // 秋季：9月、10月、11月
  else if (month >= 9 && month <= 11) {
    return {
      season: 'autumn',
      bgColor: '#fffde7', // 最最最最浅的黄色
      emoji: ['🍂', '🦢'][Math.floor(Math.random() * 2)] // 落叶或大雁
    };
  }
}

// 临时链接处理函数
async function getTemporaryImageUrl(imageUrl, type) {
  if (!imageUrl) {
    console.log(`${type}图片链接为空，使用临时图片`);
    return 'https://via.placeholder.com/800x600.png?text=' + type;
  }
  
  try {
    // 如果是云存储链接，转换为临时HTTP链接
    if (imageUrl.startsWith('cloud://')) {
      
      try {
        // 创建跨环境调用的Cloud实例
        var c = new wx.cloud.Cloud({ 
          // 必填，表示是未登录模式 
          identityless: true, 
          // 资源方 AppID 
          resourceAppid: 'wx85d92d28575a70f4', 
          // 资源方环境 ID 
          resourceEnv: 'cloud1-1gsyt78b92c539ef', 
        }) 
        await c.init();
        const result = await c.getTempFileURL({
          fileList: [imageUrl]
        });
        
        if (result.fileList && result.fileList[0] && result.fileList[0].tempFileURL) {
          return result.fileList[0].tempFileURL;
        } else {
          console.error(`${type}图片云存储链接转换结果异常:`, result);
          return 'https://via.placeholder.com/800x600.png?text=Error_' + type;
        }
      } catch (err) {
        console.error(`${type}图片云存储链接转换失败:`, err);
        return 'https://via.placeholder.com/800x600.png?text=Error_' + type;
      }
    }
    
    // 如果是HTTP链接，直接返回
    if (imageUrl.startsWith('http')) {
      console.log(`${type}图片为HTTP链接:`, imageUrl);
      return imageUrl;
    }
    
    // 其他情况，返回临时图片
    console.log(`${type}图片格式未知，使用临时图片。原始链接:`, imageUrl);
    return 'https://via.placeholder.com/800x600.png?text=' + type;
  } catch (error) {
    console.error(`处理${type}图片链接出错:`, error);
    return 'https://via.placeholder.com/800x600.png?text=Error_' + type;
  }
}

// 生成指定年份和月份的城市数据
async function generateCities(year = new Date().getFullYear(), selectedMonth = new Date().getMonth() + 1) {
  // 确保参数是数字类型
  year = parseInt(year);
  selectedMonth = parseInt(selectedMonth);
  
  try {
    // 获取当前月份的总天数
    const daysInMonth = getDaysInMonth(year, selectedMonth);
    
    // 获取当前日期，用于计算解锁状态
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();

    // 调用云函数获取已解锁的城市卡片数据 - 使用跨环境调用
    // 创建跨环境调用的Cloud实例
    var c = new wx.cloud.Cloud({ 
      // 必填，表示是未登录模式 
      identityless: true, 
      // 资源方 AppID 
      resourceAppid: 'wx85d92d28575a70f4', 
      // 资源方环境 ID 
      resourceEnv: 'cloud1-1gsyt78b92c539ef', 
    }) 
    await c.init() 
    const { result } = await c.callFunction({
      name: 'roaming',
      data: {
        action: 'getAllCityCards',
        year: year,
        month: selectedMonth
      }
    });

    // 创建一个对象来存储已解锁的城市数据，以日期为键
    const unlockedCities = {};
    if (result && result.success && result.data) {
      result.data.forEach(cityCard => {
        const unlockDate = new Date(cityCard.basicInfo.unlockDate);
        const day = unlockDate.getDate();
        unlockedCities[day] = cityCard;
      });
    }

    // 生成城市数据
    const allCities = [];
    
    // 使用 for...of 和 async/await 确保按顺序处理
    for (let day = 1; day <= daysInMonth; day++) {
      const seasonStyle = getSeasonStyle(selectedMonth);
      const targetDate = new Date(year, selectedMonth - 1, day);
      const timeDiff = targetDate.getTime() - currentDate.getTime();
      const daysToUnlock = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      // 判断是否是过去的日期
      const isPastDate = (
        year < currentYear || 
        (year === currentYear && selectedMonth < currentMonth) ||
        (year === currentYear && selectedMonth === currentMonth && day < currentDay)
      );

      if (unlockedCities[day]) {
        // 有数据的城市
        const cityCard = unlockedCities[day];
        const contentBlocks = cityCard.contentBlocks || {};

        const geographyImages = contentBlocks.geography?.images;
        const climateImages = contentBlocks.climate?.images;
        const cultureImages = contentBlocks.culture?.images;
        const cityStructureImages = contentBlocks.cityStructure?.images;
        const streetTreasuresImages = contentBlocks.streetTreasures?.images;

        const geoImageSrc = Array.isArray(geographyImages)
          ? geographyImages[0]
          : (typeof geographyImages === 'string'
            ? geographyImages
            : (contentBlocks.geography?.image || ''));

        const climateImageSrc = Array.isArray(climateImages)
          ? climateImages[0]
          : (typeof climateImages === 'string'
            ? climateImages
            : (contentBlocks.climate?.image || ''));

        const cultureImageSrc = Array.isArray(cultureImages)
          ? cultureImages[0]
          : (typeof cultureImages === 'string'
            ? cultureImages
            : (contentBlocks.culture?.image || ''));

        const cityStructureImageSrc = Array.isArray(cityStructureImages)
          ? cityStructureImages[0]
          : (typeof cityStructureImages === 'string'
            ? cityStructureImages
            : (contentBlocks.cityStructure?.image || ''));

        const streetTreasuresImageSrc = Array.isArray(streetTreasuresImages)
          ? streetTreasuresImages[0]
          : (typeof streetTreasuresImages === 'string'
            ? streetTreasuresImages
            : (contentBlocks.streetTreasures?.image || ''));

        // 使用 await 等待所有图片 URL 处理完成
        const [
          iconImageUrl,
          natureImageUrl,
          climateImageUrl,
          cultureImageUrl,
          cityStructureImageUrl,
          streetTreasuresImageUrl
        ] = await Promise.all([
          getTemporaryImageUrl(cityCard.basicInfo.coverImage, '城市封面'),
          getTemporaryImageUrl(geoImageSrc, '自然地理'),
          getTemporaryImageUrl(climateImageSrc, '气候时节'),
          getTemporaryImageUrl(cultureImageSrc, '人文气息'),
          getTemporaryImageUrl(cityStructureImageSrc, '城市脉络'),
          getTemporaryImageUrl(streetTreasuresImageSrc, '街巷宝藏')
        ]);

        // 处理视频URL
        const videoUrl = await getTemporaryImageUrl(cityCard.basicInfo.videoUrl, 'video');
        
        allCities.push({
          id: cityCard._id,
          name: cityCard.basicInfo.cityName,
          nameEn: cityCard.basicInfo.cityNameEn || '',
          country: cityCard.basicInfo.country,
          unlocked: cityCard.basicInfo.status,
          unlockDate: `${selectedMonth}月${day}日`,
          unlockYear: year,
          iconUrl: iconImageUrl,
          videoUrl: videoUrl,
          seasonBgColor: seasonStyle.bgColor,
          seasonEmoji: seasonStyle.emoji,
          season: seasonStyle.season,
          daysToUnlock: cityCard.basicInfo.status ? 0 : daysToUnlock,
          // 内容信息
          nature: contentBlocks.geography?.content,
          climate: contentBlocks.climate?.content,
          culture: contentBlocks.culture?.content,
          cityStructure: contentBlocks.cityStructure?.content,
          streetTreasures: contentBlocks.streetTreasures?.content,
          // 内容配图
          natureImage: natureImageUrl,
          climateImage: climateImageUrl,
          cultureImage: cultureImageUrl,
          cityStructureImage: cityStructureImageUrl,
          streetTreasuresImage: streetTreasuresImageUrl,
          // 音频
          audioUrl: await getTemporaryImageUrl(cityCard.audio, 'audio'),
          audioTitle: '城市音频导览',
          // 地标数据
          landmark: cityCard.landmark || []
        });
      } else if (!isPastDate) {
        // 未来的日期，显示未解锁状态
        allCities.push({
          id: `${year}-${selectedMonth}-${day}`,
          unlocked: false,
          daysToUnlock: daysToUnlock > 0 ? daysToUnlock : 0,
          seasonBgColor: seasonStyle.bgColor,
          seasonEmoji: seasonStyle.emoji,
          season: seasonStyle.season
        });
      }
      // 过去的日期如果没有数据就不显示
    }

    return allCities;
  } catch (error) {
    console.error('生成城市数据出错:', error);
    return [];
  }
}

// 生成测试数据的函数
function generateTestCities(year, selectedMonth) {
  const cities = [];
  const daysInMonth = getDaysInMonth(year, selectedMonth);
  
  for (let day = 1; day <= daysInMonth; day++) {
    const seasonStyle = getSeasonStyle(selectedMonth);
    const cityId = (selectedMonth - 1) * 31 + day;
    
    cities.push({
      id: cityId,
      name: `城市${selectedMonth}-${day}`,
      nameEn: `City ${selectedMonth}-${day}`,
      country: '测试国家',
      iconUrl: `https://via.placeholder.com/120x90.png?text=City${cityId}`,
      unlocked: true,
      unlockDate: `${selectedMonth}月${day}日`,
      daysToUnlock: 0,
      month: selectedMonth,
      day: day,
      seasonBgColor: seasonStyle.bgColor,
      seasonEmoji: seasonStyle.emoji,
      nature: `城市${selectedMonth}-${day}的自然环境`,
      climate: `城市${selectedMonth}-${day}的气候特征`,
      culture: `城市${selectedMonth}-${day}的文化特色`,
      cityStructure: `城市${selectedMonth}-${day}的城市结构`,
      streetTreasures: `城市${selectedMonth}-${day}的街巷宝库`,
      videoUrl: ''
    });
  }
  
  return cities;
}

// 初始化挑战游戏数据
function initQuizGame() {
  return {
    questions: [
      {
        text: "这座城市的主要特色是什么？",
        options: ["自然风光", "历史建筑", "现代科技", "传统文化"],
        correctAnswer: "历史建筑"
      },
      {
        text: "该城市最著名的景点是什么？",
        options: ["中央公园", "历史博物馆", "艺术中心", "古代城墙"],
        correctAnswer: "古代城墙"
      },
      {
        text: "这座城市的气候特点是？",
        options: ["四季分明", "常年温暖", "多雨潮湿", "干燥少雨"],
        correctAnswer: "四季分明"
      }
    ],
    currentQuestionIndex: 0,
    score: 0
  };
}

// 初始化拼图游戏
function initPuzzleGame() {
  console.log('[拼图调试] 开始初始化九宫格拼图游戏');
  
  // 使用默认拼图图片
  const puzzleImageUrl = 'https://via.placeholder.com/300x300.png?text=Puzzle';
  
  console.log('[拼图调试] 拼图图片URL:', puzzleImageUrl);
  
  const numRows = 3;
  const numCols = 3;
  
  // 创建9个拼图槽位（上方固定区域，3x3网格）
  const puzzleSlots = [];
  for (let i = 0; i < numRows * numCols; i++) {
    const row = Math.floor(i / numCols);
    const col = i % numCols;
    puzzleSlots.push({
      index: i,
      row: row,
      col: col,
      filled: false,
      pieceId: null,
      correct: false,
      position: {
        x: col * 100,
        y: row * 100
      }
    });
  }

  // 创建9个拼图块（每块对应原图的一个区域）
  const puzzlePieces = [];
  for (let i = 0; i < numRows * numCols; i++) {
    const row = Math.floor(i / numCols);
    const col = i % numCols;
    puzzlePieces.push({
      id: i, // 拼图块的唯一标识，代表原图的第i个区域
      correctSlot: i, // 这个拼图块应该放在第i个槽位
      row: row,
      col: col,
      placed: false, // 是否已放置到槽位中
      slotId: null, // 当前所在的槽位ID
      selected: false, // 是否被选中
      correct: false, // 是否放置正确
      backgroundPositionX: -col * 100,
      backgroundPositionY: -row * 100,
      position: {
        x: 20 + (Math.random() * 160), // 随机分布在下方区域
        y: 20 + (Math.random() * 160)
      }
    });
  }
  
  console.log('[拼图调试] 创建了', puzzleSlots.length, '个槽位和', puzzlePieces.length, '个拼图块');
  
  // 打乱拼图块顺序，确保游戏有挑战性
  const shuffledPieces = shufflePuzzlePieces([...puzzlePieces]);
  
  console.log('[拼图调试] 拼图块已打乱');
  
  console.log('[拼图调试] 九宫格拼图游戏初始化完成');
  
  return {
    puzzleImageUrl,
    puzzleSlots,
    puzzlePieces: shuffledPieces,
    currentGame: 'puzzle',
    puzzleComplete: false,
    selectedPieceIndex: -1, // 当前选中的拼图块索引
    showPuzzleNumbers: true,
    draggingPiece: null,
    dragStartX: 0,
    dragStartY: 0
  };
}

// 打乱拼图块，使用Fisher-Yates洗牌算法确保随机性
function shufflePuzzlePieces(pieces) {
  console.log('[拼图调试] 开始打乱拼图块，原始数量:', pieces.length);
  console.log('[拼图调试] 打乱前顺序:', pieces.map(p => `块${p.id}(正确位置${p.correctSlot})`));
  
  // Fisher-Yates洗牌算法
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  
  // 重新分配随机位置到下方区域
  pieces.forEach((piece, index) => {
    piece.position = {
      x: 20 + (Math.random() * 160), // 在下方区域随机分布
      y: 20 + (Math.random() * 160)
    };
  });
  
  console.log('[拼图调试] 打乱后顺序:', pieces.map(p => `块${p.id}(正确位置${p.correctSlot})`));
  console.log('[拼图调试] 拼图块打乱完成');
  return pieces;
}

// 开始拖动拼图块
function puzzlePieceTouchStart(e) {
  const index = parseInt(e.currentTarget.dataset.index);
  
  if (index !== -1 && index < this.data.puzzlePieces.length) {
    const piece = this.data.puzzlePieces[index];
    if (piece.placed) return; // 已经放置的不能选择
    
    // 取消之前选中的拼图块
    const currentSelected = this.data.selectedPieceIndex;
    if (currentSelected !== -1) {
      this.setData({
        [`puzzlePieces[${currentSelected}].selected`]: false
      });
    }
    
    // 选中当前拼图块
    this.setData({
      selectedPieceIndex: index,
      [`puzzlePieces[${index}].selected`]: true
    });
    
    // 播放选择音效
    playAudioEffect('select');
  }
}

// 槽位点击处理
function puzzleSlotTouchStart(e) {
  const slotIndex = parseInt(e.currentTarget.dataset.index);
  const selectedPieceIndex = this.data.selectedPieceIndex;
  
  if (selectedPieceIndex === -1) {
    // 没有选中拼图块，如果槽位有拼图块则移除
    removePieceFromSlot.call(this, slotIndex);
    return;
  }
  
  // 将选中的拼图块放入槽位
  placePieceToSlot.call(this, selectedPieceIndex, slotIndex);
}

// 将拼图块放入槽位
function placePieceToSlot(pieceIndex, slotIndex) {
  const slots = this.data.puzzleSlots;
  const pieces = this.data.puzzlePieces;
  
  // 验证输入参数
  if (!pieces || pieceIndex < 0 || pieceIndex >= pieces.length) {
    console.error('[拼图错误] 无效的拼图块索引:', pieceIndex);
    return;
  }
  
  if (!slots || slotIndex < 0 || slotIndex >= slots.length) {
    console.error('[拼图错误] 无效的槽位索引:', slotIndex);
    return;
  }
  
  const piece = pieces[pieceIndex];
  if (!piece || typeof piece.correctSlot === 'undefined') {
    console.error('[拼图错误] 拼图块数据无效:', piece);
    return;
  }
  
  // 如果槽位已被占用，先移除原有拼图块
  if (slots[slotIndex].filled) {
    const originalPieceId = slots[slotIndex].pieceId;
    const originalPieceIndex = pieces.findIndex(p => p.id === originalPieceId);
    if (originalPieceIndex !== -1) {
      this.setData({
        [`puzzlePieces[${originalPieceIndex}].placed`]: false,
        [`puzzlePieces[${originalPieceIndex}].slotId`]: null,
        [`puzzlePieces[${originalPieceIndex}].x`]: Math.random() * 200 + 50,
        [`puzzlePieces[${originalPieceIndex}].y`]: Math.random() * 100 + 400
      });
    }
  }
  
  // 更新槽位和拼图块状态
  const isCorrect = piece.correctSlot === slotIndex;
  
  this.setData({
    [`puzzleSlots[${slotIndex}].filled`]: true,
    [`puzzleSlots[${slotIndex}].pieceId`]: piece.id,
    [`puzzleSlots[${slotIndex}].row`]: piece.row,
    [`puzzleSlots[${slotIndex}].col`]: piece.col,
    [`puzzleSlots[${slotIndex}].correct`]: isCorrect,
    [`puzzlePieces[${pieceIndex}].placed`]: true,
    [`puzzlePieces[${pieceIndex}].slotId`]: slotIndex,
    [`puzzlePieces[${pieceIndex}].selected`]: false,
    [`puzzlePieces[${pieceIndex}].correct`]: isCorrect,
    selectedPieceIndex: -1
  });
  
  if (isCorrect) {
    
  } else {
    
  }
  
  // 检查是否完成
  
}

// 检查拼图是否完成
function checkPuzzleComplete() {
  console.log('[拼图调试] 开始检查拼图完成状态');
  
  const puzzleSlots = this.data.puzzleSlots;
  let correctCount = 0;
  let filledCount = 0;
  
  // 检查每个槽位的状态
  for (let i = 0; i < puzzleSlots.length; i++) {
    if (puzzleSlots[i].filled) {
      filledCount++;
      if (puzzleSlots[i].correct) {
        correctCount++;
      }
    }
  }
  
  const isComplete = (correctCount === 9); // 所有9个槽位都正确填充
  const allPlaced = (filledCount === 9); // 所有9个槽位都已填充
  
  console.log(`[拼图调试] 检查结果 - 已填充:${filledCount}/9, 正确:${correctCount}/9, 完成:${isComplete}`);
  
  this.setData({
    puzzleComplete: isComplete,
    puzzleAllPlaced: allPlaced
  });
  
  
  
  return isComplete;
}

// 处理拼图碎片移动
function onPuzzlePieceMove(e) {
  const piece = e.currentTarget.dataset.piece;
  const pieceIndex = e.currentTarget.dataset.index;
  const x = e.detail.x;
  const y = e.detail.y;
  
  // 更新拼图碎片位置
  const puzzlePieces = getData('puzzlePieces');
  puzzlePieces[pieceIndex].x = x;
  puzzlePieces[pieceIndex].y = y;
  
  setData({
    puzzlePieces: puzzlePieces
  });
}

// 处理拼图碎片拖动结束
function onPuzzlePieceEnd(e) {
  const pieceIndex = e.currentTarget.dataset.index;
  const piece = getData('puzzlePieces')[pieceIndex];
  const slots = getData('puzzleSlots');
  
  // 获取拼图碎片的位置和大小
  const query = wx.createSelectorQuery();
  query.selectAll('.puzzle-slot').boundingClientRect();
  query.selectAll('.puzzle-piece-movable').boundingClientRect();
  query.exec(function(res) {
    const slotRects = res[0];
    const pieceRects = res[1];
    
    if (!slotRects || !pieceRects || pieceIndex >= pieceRects.length) {
      console.error('获取元素位置失败', res);
      return;
    }
    
    const pieceRect = pieceRects[pieceIndex];
    
    // 计算拼图碎片中心点
    const pieceCenterX = pieceRect.left + pieceRect.width / 2;
    const pieceCenterY = pieceRect.top + pieceRect.height / 2;
    
    // 查找最近的槽位
    let closestSlot = null;
    let minDistance = Infinity;
    
    for (let i = 0; i < slotRects.length; i++) {
      const slotRect = slotRects[i];
      if (slots[i].filled) continue; // 跳过已填充的槽位
      
      // 计算槽位中心点
      const slotCenterX = slotRect.left + slotRect.width / 2;
      const slotCenterY = slotRect.top + slotRect.height / 2;
      
      // 计算距离
      const distance = Math.sqrt(
        Math.pow(pieceCenterX - slotCenterX, 2) + 
        Math.pow(pieceCenterY - slotCenterY, 2)
      );
      
      // 更新最近的槽位
      if (distance < minDistance) {
        minDistance = distance;
        closestSlot = {
          index: i,
          rect: slotRect
        };
      }
    }
    
    // 处理放置逻辑
    if (closestSlot && minDistance < 50) { // 50px阈值
      // 获取当前数据
      const puzzlePieces = getData('puzzlePieces');
      const puzzleSlots = getData('puzzleSlots');
      
      // 更新槽位状态
      puzzleSlots[closestSlot.index].filled = true;
      puzzleSlots[closestSlot.index].pieceId = piece.id;
      
      // 更新碎片状态
      puzzlePieces[pieceIndex].inSlot = true;
      puzzlePieces[pieceIndex].slotId = closestSlot.index;
      puzzlePieces[pieceIndex].x = 0;
      puzzlePieces[pieceIndex].y = 0;
      
      // 更新数据
      setData({
        puzzleSlots: puzzleSlots,
        puzzlePieces: puzzlePieces
      });
      
      // 播放放置音效
      playAudioEffect('drop');
      
      // 检查是否完成拼图
      checkPuzzleCompletion();
    } else {
      // 如果没有放入槽位，重置位置
      const puzzlePieces = getData('puzzlePieces');
      puzzlePieces[pieceIndex].x = 0;
      puzzlePieces[pieceIndex].y = 0;
      
      setData({
        puzzlePieces: puzzlePieces
      });
    }
  });
}

// 播放音效
function playAudioEffect(type) {
  const audioContext = wx.createInnerAudioContext();
  
  switch (type) {
    case 'drop':
      audioContext.src = '/resources/audio/drop.mp3';
      break;
    case 'complete':
      audioContext.src = '/resources/audio/complete.mp3';
      break;
    default:
      audioContext.src = '/resources/audio/click.mp3';
  }
  
  audioContext.play();
}

// 检查拼图是否完成
function checkPuzzleCompletion() {
  const slots = getData('puzzleSlots');
  const pieces = getData('puzzlePieces');
  
  // 检查所有槽位是否都已填充
  const allFilled = slots.every(slot => slot.filled);
  
  if (allFilled) {
    // 检查拼图是否正确
    const correct = slots.every((slot, index) => {
      const pieceInSlot = pieces.find(p => p.slotId === slot.id);
      return pieceInSlot && pieceInSlot.originalPosition === index;
    });
    
    if (correct) {
      setData({
        puzzleCompleted: true
      });
    }
  }
}

// 允许从槽位中移除拼图碎片
function removePieceFromSlot(slotIndex) {
  const slots = this.data.puzzleSlots;
  const pieces = this.data.puzzlePieces;
  
  // 验证输入参数
  if (!slots || slotIndex < 0 || slotIndex >= slots.length) {
    console.error('[拼图错误] 无效的槽位索引:', slotIndex);
    return;
  }
  
  if (!slots[slotIndex].filled) return;
  
  const pieceId = slots[slotIndex].pieceId;
  const pieceIndex = pieces.findIndex(p => p.id === pieceId);
  
  if (pieceIndex === -1) return;
  
  // 更新槽位状态
  this.setData({
    [`puzzleSlots[${slotIndex}].filled`]: false,
    [`puzzleSlots[${slotIndex}].pieceId`]: null,
    [`puzzleSlots[${slotIndex}].correct`]: false,
    [`puzzlePieces[${pieceIndex}].placed`]: false,
    [`puzzlePieces[${pieceIndex}].slotId`]: null,
    [`puzzlePieces[${pieceIndex}].correct`]: false,
    [`puzzlePieces[${pieceIndex}].x`]: Math.random() * 200 + 50,
    [`puzzlePieces[${pieceIndex}].y`]: Math.random() * 100 + 400
  });
  
  
}

function initMemoryGame() {
  const emojis = ['🏠', '🌳', '🚗', '🚲', '🏛️', '🏰', '🌉', '🏯'];
  const duplicatedEmojis = [...emojis, ...emojis];
  const shuffledEmojis = shuffleArray(duplicatedEmojis);

  return {
    cards: shuffledEmojis.map((emoji, index) => ({
      id: index,
      emoji: emoji,
      flipped: false,
      matched: false
    })),
    instruction: "找到所有匹配的卡片对！",
    flippedCards: [],
    matchedPairs: 0,
    moves: 0
  };
}

// 洗牌算法
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 生成1月1日的单个城市数据用于测试
function generateJan1stCity(year = 2023) {
  // 获取冬季样式
  const seasonStyle = getSeasonStyle(1);

  // 生成1月1日的城市数据
  return {
    id: 1,
    name: "哈尔滨",
    nameEn: "Harbin",
    iconUrl: "https://img1.baidu.com/it/u=2878239755,1102967135&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=333",
    unlocked: true,
    unlockDate: "1月1日",
    daysToUnlock: 0,
    month: 1,
    day: 1,
    year: year,
    season: seasonStyle.season,
    seasonBgColor: "#E3F2FD", // 淡蓝色背景，更符合冬季雪景
    seasonEmoji: "❄️",
    // 地理位置相关信息
    longitude: "E 126°38′",
    latitude: "N 45°45′",
    country: "中国",
    province: "黑龙江省",
    // 城市详情信息
    location: "中国黑龙江省哈尔滨市，位于松花江南岸，是黑龙江省的省会城市，被誉为中国最美冰雪之城。",
    population: "哈尔滨市总人口约950万，其中市区人口约550万。是黑龙江省第一大城市，也是中国东北地区重要的中心城市之一。",
    region: "中国黑龙江省，隶属于中华人民共和国东北地区。黑龙江省位于中国最北端，与俄罗斯接壤，是中国纬度最高的省份。",
    calendar: "哈尔滨使用公历，同时也遵循中国传统农历。每年1月5日前后举办的哈尔滨国际冰雪节，是世界四大冰雪节之一，已有数十年历史。",
    dayMood: "1月1日的哈尔滨，银装素裹，白雪皑皑。气温约为零下20℃，是典型的寒冷干燥天气。松花江已经结冰，冰面厚度可达1米，冰雪在阳光下闪闪发光，整座城市沉浸在冰雪的童话世界中。",
    nature: "哈尔滨地处松嫩平原，地势平坦开阔。松花江穿城而过，形成哈尔滨的重要水系。植被以温带针阔混交林为主，野生动物种类丰富。冬季积雪期长，为当地特有的冰雪景观提供了自然条件。",
    history: "哈尔滨历史可追溯至金代，古称'阿勒锦'。19世纪末因中东铁路建设而快速发展，形成独特的中俄文化交融特色。曾是远东最大的侨民城市，有'东方小巴黎'、'东方莫斯科'的美誉。现已成为中国重要的工业基地和文化教育中心。",
    culture: "哈尔滨文化融合了中国、俄罗斯等多国元素，形成独特的'哈尔滨风情'。建筑风格以欧式建筑为特色，如圣索菲亚教堂。美食文化丰富，有红肠、锅包肉等特色菜肴。冰雪文化突出，每年举办国际冰雪节，吸引世界各地游客。历史上著名人物包括音乐家阿炳、科学家郭永怀等。",
    challenge: {
      type: ['quiz', 'memory'][Math.floor(Math.random() * 2)], // 挑战类型，移除了拼图挑战
      description: `完成这个挑战来解锁${cityName}的所有信息！` // 挑战描述
    }
  };
}

// 生成通用测试城市数据
function generateTestCity(id, name, bgColor, emoji, location) {
  // 生成随机经纬度
  const randomCoord = generateRandomCoordinates();
  const [latitude, longitude] = randomCoord.split(', ');
  
  // 生成英文名称
  const cityEnglishNames = {
    "昆明": "Kunming",
    "北戴河": "Beidaihe",
    "南京": "Nanjing",
    "广州": "Guangzhou",
    "成都": "Chengdu",
    "西安": "Xi'an",
    "拉萨": "Lhasa",
    "乌鲁木齐": "Urumqi",
    "三亚": "Sanya"
  };
  
  return {
    id: id,
    name: name,
    nameEn: cityEnglishNames[name] || `City-${id}`,
    iconUrl: `https://picsum.photos/id/${id * 10}/500/333`,
    unlocked: true,
    unlockDate: `${id}月${id}日`,
    daysToUnlock: 0,
    month: id,
    day: id,
    year: 2023,
    season: ["winter", "spring", "summer", "autumn"][Math.floor((id - 1) / 3)],
    seasonBgColor: bgColor,
    seasonEmoji: emoji,
    // 地理位置相关信息
    longitude: longitude,
    latitude: latitude,
    country: "中国",
    province: getProvinceByName(name),
    // 城市详情信息
    location: location,
    population: `${name}市总人口约${Math.floor(Math.random() * 500 + 300)}万，是当地重要的城市中心。`,
    region: `中国${["东北", "华北", "华东", "华南", "西南", "西北", "中部"][Math.floor(Math.random() * 7)]}地区，是区域内的重要城市。`,
    calendar: `${name}遵循公历与中国传统农历，有多个传统节日庆典。`,
    dayMood: `${id}月${id}日的${name}，${["阳光明媚，春风和煦", "细雨绵绵，清新怡人", "骄阳似火，蝉鸣阵阵", "秋高气爽，落叶纷飞", "寒风凛冽，白雪皑皑"][Math.floor(Math.random() * 5)]}，当地居民心情愉悦，城市充满活力。`,
    nature: `${name}地形以${["平原", "丘陵", "山地", "盆地", "高原"][Math.floor(Math.random() * 5)]}为主，${["河流纵横", "湖泊众多", "森林覆盖率高", "草原广袤", "海岸线蜿蜒"][Math.floor(Math.random() * 5)]}。动植物资源丰富，生态环境良好。`,
    history: `${name}有着悠久的历史，可追溯至${["唐代", "宋代", "元代", "明代", "清代"][Math.floor(Math.random() * 5)]}。历经多次重要历史变革，形成了独特的城市风貌和文化底蕴。现已发展成为区域内重要的经济文化中心。`,
    culture: `${name}文化特色鲜明，当地以${["传统戏曲", "民间工艺", "地方美食", "传统建筑", "民俗节日"][Math.floor(Math.random() * 5)]}而闻名。节日庆典丰富多彩，美食文化独具特色。历史上出现过多位杰出人物，对当地文化发展有重要贡献。`,
    challenge: {
      type: ['quiz', 'puzzle', 'memory'][Math.floor(Math.random() * 3)], // 挑战类型，包括拼图挑战
      description: `完成这个挑战来解锁${name}的所有信息！` // 挑战描述
    }
  };
}

// 生成随机经纬度
function generateRandomCoordinates() {
  const latitude = Math.floor(Math.random() * 45) + 18; // 18-63度
  const longitude = Math.floor(Math.random() * 80) + 75; // 75-155度
  const latMinutes = Math.floor(Math.random() * 60);
  const longMinutes = Math.floor(Math.random() * 60);
  return `N ${latitude}°${latMinutes}′, E ${longitude}°${longMinutes}′`;
}

// 根据城市名获取省份
function getProvinceByName(cityName) {
  const cityProvinceMap = {
    "昆明": "云南省",
    "北戴河": "河北省",
    "南京": "江苏省",
    "广州": "广东省",
    "成都": "四川省",
    "西安": "陕西省",
    "拉萨": "西藏自治区",
    "乌鲁木齐": "新疆维吾尔自治区",
    "三亚": "海南省"
  };
  
  return cityProvinceMap[cityName] || "未知省份";
}

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLoading: true,
    loadingProgress: 0, // 确保是数字类型
    showCityDetail: false,
    showCityMuseum: false,
    showChallenge: false,
    showResult: false,
    selectedCity: null,
    scenicImages: [],
    isVideoFullscreen: false, // 添加视频全屏状态
    videoContext: null, // 添加视频上下文
    
    // 音频相关状态
    audioContext: null,
    isPlaying: false,
    showAudioPlayer: false,
    audioPlaybackRate: 1.0, // 播放速度
    showSpeedSelector: false, // 是否显示速度选择器
    speedOptions: [0.75, 0.8, 0.9, 1.0, 1.1, 1.25], // 可选播放速度
    
    // 背景音乐相关状态
    bgMusicContext: null,
    isBgMusicPlaying: false,
    // bgMusicUrl: 'cloud://cloud1-1gsyt78b92c539ef.636c-cloud1-1gsyt78b92c539ef-1370520707/audio/bgm/宁静的樱花日落旋律_轻松的器乐灵感源于宁静的动漫樱花场景_钢_爱给网_aigei_com.mp3', // 默认背景音乐URL
    bgMusicUrl: '/static/宁静的樱花日落旋律_轻松的器乐灵感源于宁静的动漫樱花场景_钢_爱给网_aigei_com.mp3',
    
    // 时间相关
    years: [],
    months: [],
    monthNames: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    currentMonthName: "",
    yearIndex: 0,
    monthIndex: 0,
    
    // 城市展示相关
    allCities: [],
    displayedCities: [],
    citiesPerPage: 9,
    currentPage: 1,
    totalPages: 1,
    unlockedCitiesCount: 0,
    
    // 挑战相关
    challengeType: '',
    singleQuestion: {
      question: '',
      options: [],
      selectedOption: '',
      correctOption: ''
    },
    multiQuestion: {
      question: '',
      options: [],
      selectedOptions: [false, false, false, false],
      correctOptions: [false, false, false, false]
    },
    puzzlePieces: [],
    puzzleSlots: [],
    selectedPieceIndex: -1,
    showPuzzleNumbers: true,
    puzzleImageUrl: '',
    isChallengeFirstTime: true,
    earnedTrees: 0,
    completedChallenges: [],
    challengeStep: 1,
    timeSequenceTrees: 0, // TimeSequence获得的小树数量
    
    // 打印预览相关字段
    showPrintPreview: false,  // 控制打印预览窗口显示
    activePrintTab: 'graphic',
    a4Pages: {
      richTextContent: [],
      plainTextContent1: []
    },
    currentSwiperIndex: 0, // 添加当前轮播图索引
    hasCheckedIn: false, // 添加页面打卡状态标记
    
    // 会员限制相关
    isVIP: false, // 用户会员状态
    showMembershipLock: false, // 是否显示会员锁定提示
    maxScrollForNonMember: 300, // 非会员最大滚动距离（rpx）
    
    // 板块动画状态
    sectionAnimations: [false, false, false, false, false], // 5个板块的动画状态
    
    // 地标功能
    cityLandmarks: [], // 当前城市的地标列表
    showLandmarkModal: false, // 是否显示地标弹窗
    currentLandmark: null, // 当前查看的地标
    
    // 封面和视频显示控制
    showMediaContainer: true, // 是否显示封面和视频
    lastScrollTop: 0, // 上次滚动位置
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {

    try {
      console.log('页面加载开始');
      
      // 获取当前日期信息
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // 获取用户登录状态
      const userInfo = wx.getStorageSync('userInfo');
      
      // 如果用户未登录，清除所有足迹记录
      if (!userInfo || !userInfo.openid) {
        wx.removeStorageSync('city_footprints');
        this.setData({
          hasCheckedIn: false
        });
      }
      
      // 获取用户登录状态和小树数量
      let timeSequenceTrees = 0;
      
      if (userInfo && userInfo.openid) {
        // 已登录，从云数据库获取小树数量和足迹记录 - 使用跨环境调用
        // 创建跨环境调用的Cloud实例
        var c = new wx.cloud.Cloud({ 
          // 必填，表示是未登录模式 
          identityless: true, 
          // 资源方 AppID 
          resourceAppid: 'wx85d92d28575a70f4', 
          // 资源方环境 ID 
          resourceEnv: 'cloud1-1gsyt78b92c539ef', 
        }) 
        c.init().then(() => {
          return c.callFunction({
            name: 'xsj_auth',
            data: {
              action: 'getUserInfo'
            }
          });
        }).then(res => {
          if (res.result && res.result.success) {
            const userData = res.result.data;
            timeSequenceTrees = userData.timeSequenceTrees || 0;
            
            // 更新页面显示
            this.setData({
              timeSequenceTrees: timeSequenceTrees
            });
            
            // 同步到全局数据和本地存储
            const app = getApp();
            if (app.globalData) {
              app.globalData.timeSequenceTrees = timeSequenceTrees;
              app.globalData.treeCount = (userData.treeCount || 0);
            }
            wx.setStorageSync('timeSequenceTrees', timeSequenceTrees);
            wx.setStorageSync('treeCount', userData.treeCount || 0);
            
            // 从云端同步足迹记录到本地
            if (userData.footprints && Array.isArray(userData.footprints)) {
              wx.setStorageSync('city_footprints', userData.footprints);
            }
          }
        }).catch(err => {
          console.error('获取用户数据失败:', err);
        });
      } else {
        console.log('用户未登录，小树数量为0');
      }
      
      // 初始化年份选项（前2年和后2年）
      const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
      
      // 初始化月份选项
      const months = [];
      const monthNames = [];
      for (let i = 1; i <= 12; i++) {
        months.push(i);
        monthNames.push(`${i}月`);
      }
      
      // 先初始化轮播图片
      await this.initScenicImages();
      
      // 设置初始数据
      this.setData({
        isLoading: true, // 默认显示加载中
        loadingProgress: 0, // 初始进度为0
        
        years: years,
        yearIndex: 2, // 默认选择当前年份（索引2）
        currentYear: currentYear,
        currentMonth: currentMonth,
        months: months, // 确保months数组存在并正确初始化
        monthNames: monthNames,
        currentMonthName: `${currentMonth}月`,
        monthIndex: currentMonth - 1,
        
        // 设置默认每页显示的城市数量
        citiesPerPage: 9,
        
        // 加载已完成的挑战记录
        completedChallenges: (() => {
          let challenges = wx.getStorageSync('completed_challenges');
          if (!Array.isArray(challenges)) {
            console.error('onLoad: 从存储加载的completedChallenges不是数组，重置为空数组');
            challenges = [];
            // 重置存储中的数据
            wx.setStorageSync('completed_challenges', []);
          }
          return challenges;
        })(),
        
        // 设置小树数量
        timeSequenceTrees: timeSequenceTrees,
        
        // 预设默认拼图图片
        puzzleImageUrl: "https://img.xianjichina.com/editer/20220720/image/1d60e05a779b9dcc3bff1bdf59d5f93d.jpg"
      });
      
      console.log('初始数据设置完成');
      
      // 加载城市数据
      this.loadCitiesData();
      
      console.log('页面加载完成');
    } catch (error) {
      console.error('页面加载出错:', error);
      
      // 显示错误提示
      wx.showToast({
        title: '页面加载失败，请重试',
        icon: 'none',
        duration: 3000
      });
    }
   },
   
   // 处理内容滚动事件
   onContentScroll(e) {
    const { scrollTop } = e.detail;
    const lastScrollTop = this.data.lastScrollTop;
    
    // 判断滚动方向并控制封面和视频显示
    // 向上滑动（scrollTop > lastScrollTop）且超过50rpx时隐藏
    // 向下滑动（scrollTop < lastScrollTop）且小于30rpx时显示
    if (scrollTop > 50 && scrollTop > lastScrollTop) {
      // 上拉，隐藏
      if (this.data.showMediaContainer) {
        this.setData({ showMediaContainer: false });
      }
    } else if (scrollTop < 30) {
      // 下拉到顶部附近，显示
      if (!this.data.showMediaContainer) {
        this.setData({ showMediaContainer: true });
      }
    }
    
    // 更新上次滚动位置
    this.setData({ lastScrollTop: scrollTop });
    
    // 仅VIP用户触发板块动画检测
    if (this.data.isVIP) {
      this.checkSectionVisibility(scrollTop);
      return;
    }
    
    // 非VIP用户检查滚动限制
    if (scrollTop > this.data.maxScrollForNonMember) {
      this.setData({
        showMembershipLock: true
      });
      return false; // 阻止滚动事件
    }
  },
  
  // 检测板块是否进入视口
  checkSectionVisibility(scrollTop) {
    const query = wx.createSelectorQuery().in(this);
    const sectionAnimations = [...this.data.sectionAnimations];
    let hasUpdate = false;
    
    // 记录哪些板块需要查询（用于后续索引映射）
    const sectionsToQuery = [];
    
    // 检查每个板块
    for (let i = 0; i < 5; i++) {
      // 如果该板块动画已触发，跳过
      if (sectionAnimations[i]) continue;
      
      sectionsToQuery.push(i);
      query.select(`#section-${i}`).boundingClientRect();
    }
    
    // 如果没有需要查询的板块，直接返回
    if (sectionsToQuery.length === 0) return;
    
    query.selectViewport().scrollOffset();
    
    query.exec((res) => {
      if (!res || res.length === 0) return;
      
      // 获取视口信息（最后一个元素）
      const viewportInfo = res[res.length - 1];
      const windowInfo = wx.getWindowInfo();
      const windowHeight = windowInfo.windowHeight;
      
      // 检查每个板块的位置
      for (let i = 0; i < res.length - 1; i++) {
        const rect = res[i];
        if (!rect) continue;
        
        // 找到对应的板块索引（使用映射数组）
        const sectionIndex = sectionsToQuery[i];
        
        // 如果该板块已经触发过动画，跳过
        if (sectionAnimations[sectionIndex]) continue;
        
        // 计算板块是否进入视口
        // 当板块顶部距离视口底部小于80%窗口高度时触发
        const threshold = windowHeight * 0.8;
        if (rect.top < threshold && rect.top + rect.height > 0) {
          sectionAnimations[sectionIndex] = true;
          hasUpdate = true;
          console.log(`板块 ${sectionIndex} 触发动画`);
        }
      }
      
      // 如果有更新，更新数据
      if (hasUpdate) {
        this.setData({
          sectionAnimations: sectionAnimations
        });
      }
    });
  },
   
   // 点击会员锁定区域
  onMembershipLockTap() {
    if (!this.data.isVIP) {
      // 直接跳转到会员页面
      wx.navigateTo({
        url: '/pages/membership/index'
      });
    }
  },
   

  
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 检查是否从足迹页面跳转过来
    const app = getApp();
    if (app.globalData && app.globalData.selectedCityId) {
      const cityId = app.globalData.selectedCityId;
      // 清除全局数据中的 cityId，避免重复处理
      app.globalData.selectedCityId = null;
      
      // 延迟调用 openCityFromFootprint，确保页面数据已加载
      setTimeout(() => {
        this.openCityFromFootprint(cityId);
      }, 500);
    }
    
    // 检查用户登录状态并获取最新的小树数量
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.openid) {
      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({ 
        // 必填，表示是未登录模式 
        identityless: true, 
        // 资源方 AppID 
        resourceAppid: 'wx85d92d28575a70f4', 
        // 资源方环境 ID 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      }) 
      c.init().then(() => {
        return c.callFunction({
          name: 'xsj_auth',
          data: {
            action: 'getUserInfo'
          }
        });
      }).then(res => {
        if (res.result && res.result.success) {
          const userData = res.result.data;
          const timeSequenceTrees = userData.timeSequenceTrees || 0;
          
          // 更新页面显示
          this.setData({
            timeSequenceTrees: timeSequenceTrees
          });
          
          // 同步到全局数据和本地存储
          const app = getApp();
          if (app.globalData) {
            app.globalData.timeSequenceTrees = timeSequenceTrees;
            app.globalData.treeCount = (userData.treeCount || 0);
          }
          wx.setStorageSync('timeSequenceTrees', timeSequenceTrees);
          wx.setStorageSync('treeCount', userData.treeCount || 0);
        }
      }).catch(err => {
        console.error('获取用户数据失败:', err);
      });
    } else {
      // 用户未登录，显示0
      this.setData({
        timeSequenceTrees: 0
      });
    }

    // 初始化视频上下文
    this.initVideoContext();
    
    // 立即检查当前VIP状态，如果不是VIP则显示会员锁
    if (!this.data.isVIP) {
      this.setData({
        showMembershipLock: true
      });
    }
    
    // 检查会员状态
    this.checkUserMemberStatus();
  },
  
  // 检查用户会员状态
  async checkUserMemberStatus() {
    try {
      const cloud = new wx.cloud.Cloud({
        identityless: true,
        resourceAppid: 'wx85d92d28575a70f4',
        resourceEnv: 'cloud1-1gsyt78b92c539ef',
      });
      await cloud.init();

      const res = await cloud.callFunction({
        name: 'xsj_pay',
        data: {
          action: 'checkMemberStatus'
        }
      });

      if (res.result && res.result.success) {
        const { isVIP } = res.result;
        this.setData({
          isVIP: isVIP,
          showMembershipLock: !isVIP // 只有非VIP用户才显示会员锁
        });
      } else {
        this.setData({
          isVIP: false,
          showMembershipLock: true // 非VIP用户进入页面时立即显示会员锁
        });
      }
    } catch (error) {
      console.error('检查会员状态失败:', error);
      this.setData({
        isVIP: false,
        showMembershipLock: true // 检查失败时也显示会员锁
      });
    }
  },
  
  /**
   * 初始化页面数据
   */
  initPageData: function() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 准备年份选项
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push(i);
    }
    
    // 准备月份选项
    const months = [];
    const monthNames = [];
    for (let i = 1; i <= 12; i++) {
      months.push(i);
      monthNames.push(`${i}月`);
    }
    
    // 更新数据
    this.setData({
      years: years,
      yearIndex: 2, // 默认选中当前年
      currentYear: currentYear,
      
      months: months,
      monthNames: monthNames,
      monthIndex: currentMonth - 1,
      currentMonth: currentMonth,
      currentMonthName: `${currentMonth}月`,
      
      // 预设默认拼图图片
      puzzleImageUrl: "https://img.xianjichina.com/editer/20220720/image/1d60e05a779b9dcc3bff1bdf59d5f93d.jpg"
    });
    
    // 使用月份所有日期的城市数据
    const cities = generateCities(this.data.currentYear, this.data.currentMonth);
    this.processCitiesData(cities);
    
    // 模拟加载进度
    this.simulateLoading();
  },
  
  /**
   * 通过城市ID从足迹打开城市详情
   */
  openCityFromFootprint: function(cityId) {
    // 在所有城市中找到对应ID的城市
    const allCities = this.data.allCities || [];
    const targetCity = allCities.find(city => city.id == cityId);
    
    if (targetCity) {
      // 找到城市，显示详情
      this.setData({
        showCityDetail: true,
        selectedCity: targetCity,
        showCityMuseum: false, // 确保显示城市详情而非博物馆
        showMediaContainer: true, // 重置封面视频显示
        lastScrollTop: 0 // 重置滚动位置
      });
    } else {
      // 未找到城市，显示提示
      wx.showToast({
        title: '未找到此城市记录',
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  /**
   * 模拟加载过程
   */
  simulateLoading: function() {
    console.log('开始模拟加载流程');
    
    // 重置加载状态
    this.setData({
      isLoading: true,
      loadingProgress: 0
    });
    
    // 使用固定的进度增量和间隔时间，确保进度显示正常
    let progress = 0;
    let progressStep = 10; // 每次增加10%
    
    const timer = setInterval(() => {
      progress += progressStep;
      
      // 输出调试信息
      console.log('当前加载进度:', progress);
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);
        
        console.log('加载完成，准备显示页面');
        
        // 加载完成后显示页面
        setTimeout(() => {
          this.setData({
            isLoading: false
          });
          console.log('页面已显示');
        }, 500);
      }
      
      this.setData({
        loadingProgress: progress
      });
    }, 200); // 每200ms更新一次进度
  },
  

  
  // 获取模拟的轮播图数据
  getMockScenicImages: function() {
    return [
      {
        imgUrl: "https://images.unsplash.com/photo-1485470733090-0aae1788d5af?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "一月·雪后初霁的北方山脉"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1491002052546-bf38f186af56?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "二月·早春江南的细雨绵绵"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1552083375-1447ce886485?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "三月·山野间绽放的春日花朵"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1513125514274-36a1cd782511?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "四月·樱花飞舞的湖畔小径"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1560277143-d8f3d2b79e1c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "五月·初夏时节的青翠山林"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "六月·夏至日落的金色田野"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1536048810607-3dc7f86981cb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "七月·荷花盛开的宁静湖泊"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1534570122623-99e8378a9aa7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "八月·夏末山间的清凉溪流"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1507369512168-9b7de0c92c34?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "九月·稻田丰收的金黄季节"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1508913863728-c7b7c3840870?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "十月·秋叶缤纷的山林小道"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "十一月·晚秋雾霭中的湖光山色"
      },
      {
        imgUrl: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80",
        caption: "十二月·冬日雪景中的松柏常青"
      }
    ];
  },
  
  // 处理城市数据
  processCitiesData: function(cities) {
    const totalPages = Math.ceil(cities.length / this.data.citiesPerPage);
    
    // 计算已解锁城市数量 - 测试模式下全部解锁
    const unlockedCount = cities.length; // 所有城市都已解锁
    
    this.setData({
      allCities: cities,
      totalPages: Math.max(1, totalPages),
      currentPage: 1, // 重置为第一页
      unlockedCitiesCount: unlockedCount,
      isLoading: false
    });
    
    this.updateDisplayedCities();
  },
  
  // 更新当前页显示的城市
  updateDisplayedCities: function() {
    const { allCities, currentPage, citiesPerPage } = this.data;
    const startIndex = (currentPage - 1) * citiesPerPage;
    const endIndex = startIndex + citiesPerPage;
    const displayedCities = allCities.slice(startIndex, endIndex);
    
    this.setData({
      displayedCities: displayedCities
    });
  },
  
  // 年份切换
  onYearChange: async function(e) {
    const yearIndex = e.detail.value;
    const currentYear = this.data.years[yearIndex];
    
    this.setData({
      yearIndex: yearIndex,
      currentYear: currentYear,
      isLoading: true,
      loadingProgress: 0
    });
    
    try {
      // 重新生成当前年月的城市数据，确保应用正确的季节样式
      const cities = await generateCities(currentYear, this.data.currentMonth);
      
      // 计算分页信息
      const totalPages = Math.ceil(cities.length / this.data.citiesPerPage);
      
      // 更新数据
      this.setData({
        allCities: cities,
        totalPages: Math.max(1, totalPages),
        currentPage: 1,
        unlockedCitiesCount: cities.filter(city => city.unlocked).length,
        loadingProgress: 80
      });
      
      // 更新显示的城市
      this.updateDisplayedCities();
      
      // 完成加载
      this.setData({
        isLoading: false,
        loadingProgress: 100
      });
      
      console.log('年份切换完成，城市数据已更新');
    } catch (error) {
      console.error('年份切换时加载城市数据出错:', error);
      wx.showToast({
        title: '加载城市数据失败，请重试',
        icon: 'none',
        duration: 3000
      });
      
      this.setData({
        isLoading: false,
        loadingProgress: 0
      });
    }
  },
  
  // 月份切换
  onMonthChange: async function(e) {
    const monthIndex = e.detail.value;
    // 确保months数组存在
    if (!this.data.months || this.data.months.length === 0) {
      // 如果months数组不存在，重新创建
      const months = [];
      for (let i = 1; i <= 12; i++) {
        months.push(i);
      }
      this.setData({
        months: months
      });
    }
    
    const currentMonth = this.data.months[monthIndex];
    const currentMonthName = this.data.monthNames[monthIndex];
    
    console.log('切换到月份:', currentMonth, currentMonthName);
    
    this.setData({
      monthIndex: monthIndex,
      currentMonth: currentMonth,
      currentMonthName: currentMonthName,
      isLoading: true,
      loadingProgress: 0
    });
    
    try {
      // 重新生成当前月份的城市数据，确保应用正确的季节样式
      const cities = await generateCities(this.data.currentYear, currentMonth);
      
      // 计算分页信息
      const totalPages = Math.ceil(cities.length / this.data.citiesPerPage);
      
      // 更新数据
      this.setData({
        allCities: cities,
        totalPages: Math.max(1, totalPages),
        currentPage: 1,
        unlockedCitiesCount: cities.filter(city => city.unlocked).length,
        loadingProgress: 80
      });
      
      // 更新显示的城市
      this.updateDisplayedCities();
      
      // 完成加载
      this.setData({
        isLoading: false,
        loadingProgress: 100
      });
      
      console.log('月份切换完成，城市数据已更新');
    } catch (error) {
      console.error('月份切换时加载城市数据出错:', error);
      wx.showToast({
        title: '加载城市数据失败，请重试',
        icon: 'none',
        duration: 3000
      });
      
      this.setData({
        isLoading: false,
        loadingProgress: 0
      });
    }
  },
  
  // 翻页操作
  onPrevPage: function() {
    if (this.data.currentPage > 1) {
      this.setData({
        currentPage: this.data.currentPage - 1
      });
      this.updateDisplayedCities();
    }
  },
  
  onNextPage: function() {
    if (this.data.currentPage < this.data.totalPages) {
      this.setData({
        currentPage: this.data.currentPage + 1
      });
      this.updateDisplayedCities();
    }
  },
  
  // 城市点击
  onCityTap: async function(e) {
    const city = e.currentTarget.dataset.city;
    
    if (city.unlocked) {
      // 初始化该城市的地标数据（异步转换云存储图片）
      const landmarks = await this.generateLandmarksForCity(city);
      
      this.setData({
        showCityDetail: true,
        selectedCity: city,
        showCityMuseum: false, // Ensure museum view is hidden initially
        sectionAnimations: [false, false, false, false, false], // 重置动画状态
        cityLandmarks: landmarks, // 设置地标数据
        showMediaContainer: true, // 重置封面视频显示
        lastScrollTop: 0 // 重置滚动位置
      }, async () => {
        // 初始化音频上下文
        await this.initAudioContext();
        this.toggleBgMusic(); // 自动播放背景音乐
        
        // 仅VIP用户触发板块动画
        if (this.data.isVIP) {
          // 延迟触发第一个板块的动画（页面打开后立即显示）
          setTimeout(() => {
            const sectionAnimations = [...this.data.sectionAnimations];
            sectionAnimations[0] = true; // 第一个板块立即显示
            this.setData({
              sectionAnimations: sectionAnimations
            });
          }, 100);
        }
      });
    } else {
      wx.showToast({
        title: `还有${city.daysToUnlock}天解锁`,
        icon: 'none'
      });
    }
  },
  
  // 关闭城市详情
  onCloseModal: function() {
    this.setData({
      showCityDetail: false
    });
    // 停止背景音乐
    if (this.data.bgMusicContext) {
      this.data.bgMusicContext.stop();
      this.data.bgMusicContext.destroy();
      this.setData({
        bgMusicContext: null,
        isBgMusicPlaying: false
      });
    }
  },
  
  // ==================== 地标功能 ====================
  
  // 为城市生成地标数据（从真实数据读取，支持云存储图片）
  generateLandmarksForCity: async function(city) {
    const cityName = city.name || '📍 默认';
    let landmarks = [];
    
    console.log('生成地标数据 - 城市:', cityName);
    console.log('city.landmark:', city.landmark);
    
    // 优先从城市数据的landmark字段读取
    if (city.landmark && Array.isArray(city.landmark) && city.landmark.length > 0) {
      console.log('使用真实地标数据，数量:', city.landmark.length);
      // 使用真实数据，并转换云存储图片
      const landmarkPromises = city.landmark.map(async (item, index) => {
        // 默认emoji列表（如果数据中没有emoji字段）- 地标主题
        const defaultEmojis = ['🏛️', '🗼', '🌉', '🏯', '⛩️', '🗽', '🏰', '🕌', '🗿'];
        
        // emoji：优先使用数据中的emoji字段，否则使用默认emoji
        const emoji = item.emoji || defaultEmojis[index % defaultEmojis.length];
        
        // picture字段处理：只用于弹窗背景图
        let imageUrl = '';
        if (item.picture) {
          // 如果是云存储链接，转换为临时HTTP链接
          if (item.picture.startsWith('cloud://')) {
            try {
              const c = new wx.cloud.Cloud({
                identityless: true,
                resourceAppid: 'wx85d92d28575a70f4',
                resourceEnv: 'cloud1-1gsyt78b92c539ef',
              });
              await c.init();
              const result = await c.getTempFileURL({
                fileList: [item.picture]
              });
              
              if (result.fileList && result.fileList[0] && result.fileList[0].tempFileURL) {
                imageUrl = result.fileList[0].tempFileURL;
              } else {
                console.error('地标图片云存储链接转换失败:', result);
              }
            } catch (err) {
              console.error('地标图片转换临时链接失败:', err);
            }
          } else if (item.picture.startsWith('http://') || item.picture.startsWith('https://')) {
            // HTTP链接直接使用
            imageUrl = item.picture;
          }
        }
        
        // 如果没有图片，使用城市封面作为背景
        if (!imageUrl) {
          imageUrl = city.iconUrl || '';
        }
        
        console.log(`地标${index + 1} - emoji: ${emoji}, name: ${item.name}, 图片: ${imageUrl}`);
        
        return {
          id: index + 1,
          emoji: emoji, // 地标节点显示的emoji
          name: item.name || '未命名地标',
          description: item.description || '暂无描述',
          image: imageUrl, // 弹窗背景图
          lit: false // 默认未点亮
        };
      });
      
      landmarks = await Promise.all(landmarkPromises);
      console.log('地标数据转换完成:', landmarks);
    } else {
      // 如果没有数据，使用默认地标
      console.log('未找到地标数据，使用默认地标');
      landmarks = [
        { id: 1, emoji: '🏛️', name: '古典建筑', description: '这是一座历史悠久的建筑，见证了这座城市的变迁', image: city.iconUrl || '', lit: false },
        { id: 2, emoji: '🗼', name: '地标之塔', description: '城市的象征，在这里可以俯瞰整座城市的美景', image: city.iconUrl || '', lit: false },
        { id: 3, emoji: '🌉', name: '标志桥梁', description: '连接城市南北的重要交通枢纽，也是最美的风景线', image: city.iconUrl || '', lit: false },
        { id: 4, emoji: '🏯', name: '古城遗址', description: '古老的城楼遗址，承载着城市千年的历史记忆', image: city.iconUrl || '', lit: false }
      ];
    }
    
    // 从本地存储加载已点亮状态
    const storageKey = `landmarks_${cityName}`;
    try {
      const savedLandmarks = wx.getStorageSync(storageKey);
      if (savedLandmarks && Array.isArray(savedLandmarks)) {
        // 合并保存的点亮状态
        landmarks = landmarks.map((landmark, index) => ({
          ...landmark,
          lit: savedLandmarks[index]?.lit || false
        }));
      }
    } catch (e) {
      console.error('读取地标状态失败:', e);
    }
    
    return landmarks;
  },
  
  // 点击地标
  onLandmarkTap: function(e) {
    const index = e.currentTarget.dataset.index;
    const landmark = this.data.cityLandmarks[index];
    const landmarks = this.data.cityLandmarks;
    
    if (!landmark) return;
    
    // 检查是否可以点击（必须前面的都已点亮）
    for (let i = 0; i < index; i++) {
      if (!landmarks[i].lit) {
        wx.showToast({
          title: `请先点亮：${landmarks[i].name}`,
          icon: 'none',
          duration: 2000
        });
        return;
      }
    }
    
    // 可以点击，显示弹窗
    this.setData({
      currentLandmark: landmark,
      showLandmarkModal: true
    });
  },
  
  // 关闭地标弹窗
  closeLandmarkModal: function() {
    this.setData({
      showLandmarkModal: false
    });
  },
  
  // 阻止事件冒泡
  stopPropagation: function() {
    // 空函数，只是用来阻止冒泡
  },
  
  // 点亮地标
  lightUpLandmark: function() {
    if (!this.data.currentLandmark) return;
    
    // 如果已经点亮，不做处理
    if (this.data.currentLandmark.lit) {
      wx.showToast({
        title: '已经点亮过了哦~',
        icon: 'none'
      });
      return;
    }
    
    // 获取当前地标的索引
    const landmarks = [...this.data.cityLandmarks];
    const index = landmarks.findIndex(l => l.id === this.data.currentLandmark.id);
    
    if (index === -1) return;
    
    // 检查是否按顺序点亮（必须前面的都点亮了）
    for (let i = 0; i < index; i++) {
      if (!landmarks[i].lit) {
        wx.showModal({
          title: '提示',
          content: `请先点亮前面的地标：${landmarks[i].name}`,
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }
    }
    
    // 播放点亮音效
    this.playLightUpSound();
    
    // 震动反馈
    wx.vibrateShort({
      type: 'medium'
    });
    
    // 更新地标列表中的点亮状态
    landmarks[index].lit = true;
    
    // 更新当前地标状态
    const updatedCurrentLandmark = { ...this.data.currentLandmark, lit: true };
    
    this.setData({
      cityLandmarks: landmarks,
      currentLandmark: updatedCurrentLandmark
    });
    
    // 保存到本地存储
    const cityName = this.data.selectedCity?.name || '📍 默认';
    const storageKey = `landmarks_${cityName}`;
    try {
      wx.setStorageSync(storageKey, landmarks);
    } catch (e) {
      console.error('保存地标状态失败:', e);
    }
    
    // 显示成功提示
    wx.showToast({
      title: '🎉 点亮成功！',
      icon: 'success',
      duration: 2000
    });
    
    // 检查是否全部点亮
    const allLit = landmarks.every(l => l.lit);
    if (allLit) {
      // 播放完成音效
      setTimeout(() => {
        this.playCompleteSound();
        wx.vibrateShort({ type: 'heavy' });
      }, 500);
      
      setTimeout(() => {
        wx.showModal({
          title: '🏆 恭喜你！',
          content: `你已经点亮了${cityName}的所有地标！\n继续探索更多城市吧~`,
          showCancel: false,
          confirmText: '太棒了'
        });
      }, 2000);
    }
  },
  
  // 播放点亮音效
  playLightUpSound: function() {
    try {
      const innerAudioContext = wx.createInnerAudioContext();
      // 使用本地音效文件
      innerAudioContext.src = '/static/ding-402325.mp3';
      innerAudioContext.volume = 0.6;
      innerAudioContext.play();
      
      // 播放完成后销毁实例
      innerAudioContext.onEnded(() => {
        innerAudioContext.destroy();
      });
      
      // 错误处理
      innerAudioContext.onError((res) => {
        console.log('点亮音效播放失败:', res);
        innerAudioContext.destroy();
      });
    } catch (e) {
      console.error('创建音频上下文失败:', e);
    }
  },
  
  // 播放全部完成音效
  playCompleteSound: function() {
    try {
      const innerAudioContext = wx.createInnerAudioContext();
      // 使用本地音效文件（连续播放两次表示完成）
      innerAudioContext.src = '/static/ding-402325.mp3';
      innerAudioContext.volume = 0.7;
      innerAudioContext.play();
      
      // 第一次播放完后再播放一次
      innerAudioContext.onEnded(() => {
        const secondPlay = wx.createInnerAudioContext();
        secondPlay.src = '/static/ding-402325.mp3';
        secondPlay.volume = 0.8;
        secondPlay.play();
        secondPlay.onEnded(() => {
          secondPlay.destroy();
        });
        secondPlay.onError(() => {
          secondPlay.destroy();
        });
        innerAudioContext.destroy();
      });
      
      innerAudioContext.onError((res) => {
        console.log('完成音效播放失败:', res);
        innerAudioContext.destroy();
      });
    } catch (e) {
      console.error('创建音频上下文失败:', e);
    }
  },
  
  // 开始挑战 - 这是旧的函数名，可能造成冲突
  onStartChallenge: function() {
    console.log('旧的onStartChallenge函数被调用 - 这可能导致冲突');
    const { selectedCity } = this.data;
    const challengeType = selectedCity.challenge.type;
    
    let gameData = {};
    switch (challengeType) {
      case 'quiz':
        gameData = initQuizGame();
        this.setData({
          quizGame: gameData,
          currentQuestion: gameData.questions[0]
        });
        break;
        break;
      case 'memory':
        gameData = initMemoryGame();
        this.setData({
          memoryGame: gameData,
          memoryInstruction: gameData.instruction,
          memoryCards: gameData.cards
        });
        break;
    }
    
    this.setData({
      showChallenge: true,
      challengeType: challengeType,
      challengeProgress: 0,
      challengeProgressText: '0%'
    });
    
    // 测试模式：自动完成挑战，延迟2秒以便看到界面
    setTimeout(() => {
      this.completeChallenge();
    }, 2000);
  },
  
  // 关闭挑战 - 旧的函数名
  onCloseChallenge: function() {
    console.log('旧的onCloseChallenge函数被调用 - 可能导致冲突');
    this.setData({
      showChallenge: false
    });
  },
  
  // 问答游戏 - 选择答案
  onSelectAnswer: function(e) {
    const answer = e.currentTarget.dataset.answer;
    const { quizGame, currentQuestion } = this.data;
    
    if (answer === currentQuestion.correctAnswer) {
      quizGame.score++;
    }
    
    quizGame.currentQuestionIndex++;
    
    // 更新进度
    const progress = Math.floor((quizGame.currentQuestionIndex / quizGame.questions.length) * 100);
    
    if (quizGame.currentQuestionIndex < quizGame.questions.length) {
      this.setData({
        quizGame: quizGame,
        currentQuestion: quizGame.questions[quizGame.currentQuestionIndex],
        challengeProgress: progress,
        challengeProgressText: `${progress}%`
      });
    } else {
      // 游戏完成
      this.setData({
        challengeProgress: 100,
        challengeProgressText: '100%'
      });
      
      setTimeout(() => {
        this.completeChallenge();
      }, 1000);
    }
  },
  
  // 拼图游戏 - 选择拼图片段
  onSelectPuzzlePiece: function(e) {
    const index = e.currentTarget.dataset.index;
    const { puzzleGame, puzzlePieces } = this.data;
    
    // 如果没有选中的片段，则选中当前片段
    if (!puzzlePieces.find(p => p.selected)) {
      puzzlePieces[index].selected = true;
      this.setData({
        puzzlePieces: puzzlePieces
      });
    } else {
      // 如果已有选中的片段，则交换位置
      const selectedIndex = puzzlePieces.findIndex(p => p.selected);
      
      if (selectedIndex !== index) {
        [puzzlePieces[selectedIndex].currentPosition, puzzlePieces[index].currentPosition] = 
        [puzzlePieces[index].currentPosition, puzzlePieces[selectedIndex].currentPosition];
        
        puzzlePieces[selectedIndex].selected = false;
        puzzleGame.moves++;
        
        // 检查是否完成
        const isComplete = puzzlePieces.every(p => p.currentPosition === p.correctPosition);
        puzzleGame.isComplete = isComplete;
        
        // 更新进度
        let progress = Math.min(Math.floor((puzzleGame.moves / 15) * 100), 100);
        if (isComplete) progress = 100;
        
        this.setData({
          puzzlePieces: puzzlePieces,
          puzzleGame: puzzleGame,
          challengeProgress: progress,
          challengeProgressText: isComplete ? '完成!' : `${progress}%`
        });
        
        if (isComplete) {
          setTimeout(() => {
            this.completeChallenge();
          }, 1000);
        }
      } else {
        // 点击已选中的片段，取消选中
        puzzlePieces[index].selected = false;
        this.setData({
          puzzlePieces: puzzlePieces
        });
      }
    }
  },

  // 九宫格拼图 - 选择拼图块
  onPuzzlePieceTap: function(e) {
    puzzlePieceTouchStart.call(this, e);
  },

  // 九宫格拼图 - 点击槽位
  onPuzzleSlotTap: function(e) {
    puzzleSlotTouchStart.call(this, e);
  },
  
  // 记忆游戏 - 翻牌
  onFlipCard: function(e) {
    const index = e.currentTarget.dataset.index;
    const { memoryGame, memoryCards } = this.data;
    
    // 如果已匹配或已翻开，则忽略
    if (memoryCards[index].matched || memoryCards[index].flipped) {
      return;
    }
    
    // 如果已有两张卡片翻开，则忽略
    if (memoryGame.flippedCards.length >= 2) {
      return;
    }
    
    // 翻开卡片
    memoryCards[index].flipped = true;
    memoryGame.flippedCards.push(index);
    
    this.setData({
      memoryCards: memoryCards,
      memoryGame: memoryGame
    });
    
    // 如果翻开了两张卡片，检查是否匹配
    if (memoryGame.flippedCards.length === 2) {
      memoryGame.moves++;
      
      const [firstIndex, secondIndex] = memoryGame.flippedCards;
      
      if (memoryCards[firstIndex].emoji === memoryCards[secondIndex].emoji) {
        // 匹配成功
        memoryCards[firstIndex].matched = true;
        memoryCards[secondIndex].matched = true;
        memoryGame.matchedPairs++;
        memoryGame.flippedCards = [];
        
        // 更新进度
        const progress = Math.floor((memoryGame.matchedPairs / 8) * 100);
        
        this.setData({
          memoryCards: memoryCards,
          memoryGame: memoryGame,
          challengeProgress: progress,
          challengeProgressText: `${progress}%`
        });
        
        // 检查是否所有卡片都匹配
        if (memoryGame.matchedPairs === 8) {
          setTimeout(() => {
            this.completeChallenge();
          }, 1000);
        }
      } else {
        // 不匹配，翻回去
        setTimeout(() => {
          memoryCards[firstIndex].flipped = false;
          memoryCards[secondIndex].flipped = false;
          memoryGame.flippedCards = [];
          
          this.setData({
            memoryCards: memoryCards,
            memoryGame: memoryGame
          });
        }, 1000);
      }
    }
  },
  
  // 完成挑战
  completeChallenge: function() {
    const { selectedCity } = this.data;
    
    this.setData({
      showChallenge: false,
      showCityDetail: false,
      showUnlockAnimation: true,
      newlyUnlockedCity: selectedCity
    });
  },
  
  // 查看新解锁的城市
  onViewUnlockedCity: function() {
    this.setData({
      showUnlockAnimation: false,
      showCityDetail: true,
      selectedCity: this.data.newlyUnlockedCity,
      showMediaContainer: true, // 重置封面视频显示
      lastScrollTop: 0 // 重置滚动位置
    });
  },
  
  // 打印城市信息
  onPrintCity: async function() {
    const { selectedCity } = this.data;
    
    if (!selectedCity) {
      wx.showToast({
        title: '无法获取城市信息',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({
      title: '加载打印数据',
      mask: true
    });

    try {
      // 使用云函数获取城市卡片数据 - 使用跨环境调用
      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({ 
        // 必填，表示是未登录模式 
        identityless: true, 
        // 资源方 AppID 
        resourceAppid: 'wx85d92d28575a70f4', 
        // 资源方环境 ID 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      }) 
      await c.init() 
      const { result } = await c.callFunction({
        name: 'roaming',
        data: {
          action: 'getCityCard',
          cityName: selectedCity.name
        }
      });

      if (!result.success) {
        throw new Error(result.message || '获取城市数据失败');
      }

      const cityData = result.data;
      
      // 使用a4_pages字段的数据，如果没有则使用空数组
      const a4PagesData = cityData.a4_pages || {
        richTextContent: [],
        plainTextContent1: []
      };

      // 处理图片URL，确保云存储链接被正确转换
      const processedA4Pages = {
        richTextContent: [],
        plainTextContent1: []
      };

      // 处理图文版内容
      if (a4PagesData.richTextContent && a4PagesData.richTextContent.length > 0) {
        for (const imageUrl of a4PagesData.richTextContent) {
          const processedUrl = await getTemporaryImageUrl(imageUrl, 'image');
          if (processedUrl) {
            processedA4Pages.richTextContent.push(processedUrl);
          }
        }
      }

      // 处理文字版1内容
      if (a4PagesData.plainTextContent1 && a4PagesData.plainTextContent1.length > 0) {
        for (const imageUrl of a4PagesData.plainTextContent1) {
          const processedUrl = await getTemporaryImageUrl(imageUrl, 'image');
          if (processedUrl) {
            processedA4Pages.plainTextContent1.push(processedUrl);
          }
        }
      }


      // 更新状态并显示预览
      this.setData({
        showPrintPreview: true,
        activePrintTab: 'graphic',
        a4Pages: processedA4Pages
      });

    } catch (error) {
      console.error('准备打印数据失败:', error);
      wx.showToast({
        title: '准备打印数据失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 切换打印预览标签页
  switchPrintTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activePrintTab: tab
    });
  },

  // 关闭打印预览
  closePrintPreview: function() {
    this.setData({
      showPrintPreview: false
    });
  },
  
  // 听取城市介绍
  onListenCity: function() {
    const selectedCity = this.data.selectedCity;
    
    if (!selectedCity) {
      wx.showToast({
        title: '无法获取城市信息',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    // 如果正在播放，则停止播放
    if (this.data.isPlayingAudio) {
      if (this.data.audioInstance) {
        this.data.audioInstance.stop();
      }
      
      this.setData({
        isPlayingAudio: false,
        audioProgress: 0,
        audioCurrentTime: 0
      });
      
      wx.showToast({
        title: '已停止播放',
        icon: 'none',
        duration: 1500
      });
      
      return;
    }
    
    // 显示加载中提示
    wx.showToast({
      title: '正在加载音频...',
      icon: 'loading',
      duration: 2000
    });
    
    // 预留API调用示例
    // 以下注释代码演示了如何从API获取音频URL
    /*
    wx.request({
      url: this.data.audioApiEndpoint,
      method: 'GET',
      data: {
        cityId: selectedCity.id,
        cityName: selectedCity.name,
        language: 'zh-CN' // 或其他语言选项
      },
      success: (res) => {
        if (res.data && res.data.audioUrl) {
          this.playAudioFromUrl(res.data.audioUrl);
        } else {
          wx.showToast({
            title: '无法获取音频',
            icon: 'none',
            duration: 1500
          });
        }
      },
      fail: (error) => {
        console.error('获取音频失败:', error);
        wx.showToast({
          title: '获取音频失败',
          icon: 'none',
          duration: 1500
        });
      }
    });
    */
    
    // 演示用，模拟从API获取数据后的延迟
    setTimeout(() => {
      // 这里可以替换为真实的音频URL
      const demoAudioUrl = 'https://example.com/audio/city_' + selectedCity.id + '.mp3';
      
      // 播放音频
      this.playAudioFromUrl(demoAudioUrl);
      
      console.log('尝试播放城市语音介绍:', selectedCity.name, demoAudioUrl);
    }, 1500);
  },
  
  // 从URL播放音频
  playAudioFromUrl: function(audioUrl) {
    // 创建音频实例
    const audioContext = wx.createInnerAudioContext();
    audioContext.src = audioUrl;
    audioContext.autoplay = true;
    
    // 设置音频事件
    audioContext.onPlay(() => {
      console.log('音频开始播放');
      this.setData({
        isPlayingAudio: true
      });
      
      wx.showToast({
        title: '正在播放城市介绍',
        icon: 'success',
        duration: 1500
      });
    });
    
    audioContext.onTimeUpdate(() => {
      if (audioContext.duration > 0) {
        this.setData({
          audioDuration: audioContext.duration,
          audioCurrentTime: audioContext.currentTime,
          audioProgress: (audioContext.currentTime / audioContext.duration) * 100
        });
      }
    });
    
    audioContext.onEnded(() => {
      console.log('音频播放结束');
      this.setData({
        isPlayingAudio: false,
        audioProgress: 0,
        audioCurrentTime: 0
      });
    });
    
    audioContext.onError((err) => {
      console.error('音频播放错误:', err);
      wx.showToast({
        title: '音频播放失败',
        icon: 'none',
        duration: 1500
      });
      
      this.setData({
        isPlayingAudio: false
      });
    });
    
    // 保存音频实例
    this.setData({
      audioInstance: audioContext
    });
  },

  // 字体调大功能
  increaseFontSize: function() {
    // 获取当前字体大小设置，如果没有则默认为28rpx（即info-content的默认大小）
    const currentSize = wx.getStorageSync('city_text_font_size') || 28;
    // 字体最大不超过36rpx
    const newSize = Math.min(currentSize + 2, 36);
    wx.setStorageSync('city_text_font_size', newSize);
    this.updateFontSize(newSize);
    wx.showToast({
      title: '字体已放大',
      icon: 'none',
      duration: 1000
    });
  },

  // 字体调小功能
  decreaseFontSize: function() {
    // 获取当前字体大小设置，如果没有则默认为28rpx
    const currentSize = wx.getStorageSync('city_text_font_size') || 28;
    // 字体最小不低于22rpx
    const newSize = Math.max(currentSize - 2, 22);
    wx.setStorageSync('city_text_font_size', newSize);
    this.updateFontSize(newSize);
    wx.showToast({
      title: '字体已缩小',
      icon: 'none',
      duration: 1000
    });
  },

  // 切换背景音乐播放状态
  toggleBgMusic: async function() {


    if (this.data.isBgMusicPlaying) {
      // 停止背景音乐
      if (this.data.bgMusicContext) {
        this.data.bgMusicContext.stop();
        this.data.bgMusicContext.destroy();
      }
      this.setData({
        isBgMusicPlaying: false,
        bgMusicContext: null
      });
      wx.showToast({
        title: '背景音乐已停止',
        icon: 'none',
        duration: 1000
      });
    } else {
      // 开始播放背景音乐
      try {
        const bgMusicContext = wx.createInnerAudioContext();
        const bgMusicUrl = this.data.bgMusicUrl;
        if (bgMusicUrl.startsWith('cloud://')) {
          // 跨环境创建 Cloud 实例
        const cloudInstance = new wx.cloud.Cloud({
          identityless: true,
          resourceAppid: 'wx85d92d28575a70f4',
          resourceEnv: 'cloud1-1gsyt78b92c539ef',
        });

        try {
          await cloudInstance.init(); // 确保云实例初始化完成
          const res = await cloudInstance.getTempFileURL({
            fileList: [bgMusicUrl]
          });

          if (res.fileList && res.fileList.length > 0) {
            bgMusicContext.src = res.fileList[0].tempFileURL;
            bgMusicContext.play();
          } else {
            console.error('获取临时链接失败: 文件列表为空');
            wx.showToast({
              title: '背景音乐加载失败',
              icon: 'none',
              duration: 2000
            });
          }
        } catch (err) {
          console.error('云操作失败:', err);
          wx.showToast({
            title: '背景音乐加载失败',
            icon: 'none',
            duration: 2000
          });
        }
        } else {
          bgMusicContext.src = bgMusicUrl;
          bgMusicContext.play();
        }
        bgMusicContext.loop = true; // 循环播放
        bgMusicContext.volume = 0.1; // 设置音量为10%
        
        bgMusicContext.onPlay(() => {
          console.log('背景音乐开始播放');
          this.setData({
            isBgMusicPlaying: true
          });
        });
        
        bgMusicContext.onError((res) => {
          console.error('背景音乐播放失败:', res);
          wx.showToast({
            title: '背景音乐播放失败',
            icon: 'none',
            duration: 2000
          });
          this.setData({
            isBgMusicPlaying: false,
            bgMusicContext: null
          });
        });
        
        bgMusicContext.onEnded(() => {
          console.log('背景音乐播放结束');
        });
        
        this.setData({
          bgMusicContext: bgMusicContext
        });
        
        bgMusicContext.play();
        
        wx.showToast({
          title: '背景音乐已开启',
          icon: 'none',
          duration: 1000
        });
      } catch (error) {
        console.error('创建背景音乐上下文失败:', error);
        wx.showToast({
          title: '背景音乐初始化失败',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  // 更新页面上的字体大小
  updateFontSize: function(size) {
    // 动态修改CSS变量
    this.setData({
      fontSizeStyle: `--content-font-size: ${size}rpx;`
    });
  },

  // 留下足迹功能
  leaveFootprint: async function() {
    // 获取当前城市
    const city = this.data.selectedCity;
    if (!city || !city.id) {
      wx.showToast({
        title: '无法添加足迹',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    // 获取现有足迹列表
    let footprints = wx.getStorageSync('city_footprints') || [];
    
    // 检查是否已经添加过这个城市的足迹
    const cityFootprintExists = footprints.some(item => item.cityId === city.id);
    
    if (cityFootprintExists) {
      wx.showToast({
        title: '已打过卡',
        icon: 'success',
        duration: 1500,
        mask: true
      });
      return;
    }

    const now = new Date();
    const timestamp = now.toISOString();
    const formattedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    
    try {
      // 调用云函数更新用户足迹 - 使用跨环境调用
      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({ 
        // 必填，表示是未登录模式 
        identityless: true, 
        // 资源方 AppID 
        resourceAppid: 'wx85d92d28575a70f4', 
        // 资源方环境 ID 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      }) 
      await c.init() 
      const result = await c.callFunction({
        name: 'xsj_auth',
        data: {
          action: 'updateUserFootprints',
          data: {
            cityId: city.id,
            cityName: city.name,
            timestamp: timestamp,
            date: formattedDate
          }
        }
      });

      if (!result.result.success) {
        throw new Error('保存足迹到云数据库失败');
      }
      
      // 添加新足迹到本地存储
      footprints.push({
        cityId: city.id,
        cityName: city.name,
        timestamp: timestamp,
        date: formattedDate
      });
      
      // 保存足迹列表到本地
      wx.setStorageSync('city_footprints', footprints);

      // 设置页面打卡状态为已打卡
      this.setData({
        hasCheckedIn: true
      });

      // 显示成功提示
      wx.showToast({
        title: '打卡成功',
        icon: 'success',
        duration: 1500
      });

    } catch (error) {
      console.error('保存足迹失败:', error);
      wx.showToast({
        title: '打卡失败',
        icon: 'error',
        duration: 1500
      });
    }
  },

  // 添加视频预览功能，连接后端视频接口
  playVideo: function() {
    const city = this.data.selectedCity;
    // 这里是视频接口预留
    if (!city || !city.videoUrl) {
      wx.showToast({
        title: '视频资源准备中',
        icon: 'none',
        duration: 1500
      });
    } else {
      // 如果已有视频资源，可以调用预览
      console.log('播放城市视频:', city.videoUrl);
    }
  },

  // 切换全屏状态
  toggleFullscreen: function() {
    const videoContext = wx.createVideoContext('cityVideo', this);
    videoContext.requestFullScreen({ direction: 90 });
  },

  // 视频进入和退出全屏时的处理
  onVideoFullscreenChange: function(e) {
    const isFullscreen = e.detail.fullScreen;
    console.log('全屏状态改变：', isFullscreen);
    this.setData({
      isVideoFullscreen: isFullscreen
    });
  },

  // 视频播放出错时的处理
  onVideoError: function(e) {
    console.error('视频播放出错:', e);
    wx.showToast({
      title: '视频加载失败',
      icon: 'none',
      duration: 2000
    });
  },

  // 打开挑战弹窗
  openChallenge: function(e) {
    console.log('openChallenge函数被调用 - 开始');
    
    // 检查用户是否登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      wx.showModal({
        title: '提示',
        content: '登录后才能参与挑战哦',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/cloudDwelling/index'
            });
          }
        }
      });
      return;
    }
    
    const { selectedCity } = this.data;
    
    if (!selectedCity) {
      console.log('无法获取城市信息，终止挑战');
      wx.showToast({
        title: '无法获取城市信息',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    console.log('立即显示挑战弹窗');
    // 立即显示挑战弹窗，避免用户需要多次点击
    this.setData({
      showChallenge: true,
      challengeStep: 1 // 确保从第一步开始
    });
    
    // 检查是否首次挑战
    let completedChallenges = this.data.completedChallenges || [];
    
    // 确保completedChallenges是一个数组
    if (!Array.isArray(completedChallenges)) {
      console.error('completedChallenges不是数组，重置为空数组');
      completedChallenges = [];
    }
    
    const isChallengeFirstTime = !completedChallenges.some(challenge => challenge && challenge.cityId === selectedCity.id);
    console.log('是否首次挑战:', isChallengeFirstTime, '已完成挑战数:', completedChallenges.length);
    
    
    // 显示加载中弹窗
    wx.showLoading({
      title: '正在准备挑战...',
      mask: true
    });
    
    // 更新首次挑战状态
    this.setData({
      isChallengeFirstTime: isChallengeFirstTime,
      isFirstAttempt: isChallengeFirstTime, // 添加这一行，用于显示
      completedChallenges: completedChallenges
    });
    
    if (!isChallengeFirstTime) {
      // 如果不是首次挑战，显示提示
      wx.showToast({
        title: '重复挑战不会再获得小树奖励哦',
        icon: 'none',
        duration: 2000
      });
    }
    
    console.log('开始加载测试挑战数据');
    // 立即加载测试挑战数据
    this.loadTestChallengeData(selectedCity);
    
    console.log('openChallenge函数执行完毕');
  },
  
  // 加载测试挑战数据（与城市相关的测试数据）
  loadTestChallengeData: function(city) {
    console.log('loadTestChallengeData 开始执行', city?.name);
    
    // 显示加载提示
    wx.showLoading({
      title: '加载挑战数据...',
      mask: true
    });

    // 调用云函数获取城市数据 - 使用跨环境调用
    // 创建跨环境调用的Cloud实例
    var c = new wx.cloud.Cloud({ 
      // 必填，表示是未登录模式 
      identityless: true, 
      // 资源方 AppID 
      resourceAppid: 'wx85d92d28575a70f4', 
      // 资源方环境 ID 
      resourceEnv: 'cloud1-1gsyt78b92c539ef', 
    }) 
    c.init().then(() => {
      return c.callFunction({
        name: 'roaming',
        data: {
          action: 'getCityCard',
          cityName: city.name
        }
      });
    }).then(async res => {
      console.log('获取到城市数据:', res.result);
      
      if (!res.result.success || !res.result.data) {
        throw new Error('城市数据不存在');
      }

      // 获取拼图图片的临时URL（如果存在）
      if (res.result.data.challenges?.puzzleGame?.image) {
        try {
          const puzzleImageUrl = await getTemporaryImageUrl(
            res.result.data.challenges.puzzleGame.image,
            'puzzle'
          );
          console.log('获取到拼图图片URL:', puzzleImageUrl);
          
          // 更新拼图图片URL
          res.result.data.challenges.puzzleGame.puzzleImageUrl = puzzleImageUrl;
        } catch (error) {
          console.error('获取拼图图片临时URL失败:', error);
        }
      }

      // 保存原有的城市数据
      const originalCityData = this.data.selectedCity;
      
      // 合并挑战数据和原有数据
      const challenges = res.result.data.challenges;
      
      // 初始化挑战步骤和内容
      this.setData({
        challengeStep: 1,
        
        // 初始化单选题
        singleQuestion: {
          question: challenges.singleChoice.question,
          options: challenges.singleChoice.options,
          correctOption: challenges.singleChoice.correctAnswer === "A" ? 0 : 
                        challenges.singleChoice.correctAnswer === "B" ? 1 :
                        challenges.singleChoice.correctAnswer === "C" ? 2 : 3,
          selectedOption: null,
          showResult: false,
          isCorrect: false
        },
        
        // 初始化多选题
        multiQuestion: {
          question: challenges.multipleChoice.question,
          options: challenges.multipleChoice.options,
          correctOptions: challenges.multipleChoice.options.map((_, index) => 
            challenges.multipleChoice.correctAnswers.includes(String.fromCharCode(65 + index))
          ),
          selectedOptions: new Array(challenges.multipleChoice.options.length).fill(false),
          hasSelected: false,
          showResult: false,
          isCorrect: false
        },
        
        // 初始化拼图
        puzzleImageUrl: res.result.data.challenges?.puzzleGame?.puzzleImageUrl || 'https://via.placeholder.com/800x600.png?text=Puzzle',
        puzzleAnswers: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        showPuzzleNumbers: true,
        selectedPieceIndex: null,
        puzzleComplete: false,
        puzzleAllPlaced: false,
        
        // 保持原有的城市数据
        selectedCity: {
          ...originalCityData,
          challenges: res.result.data.challenges
        }
      });
      
      console.log('挑战弹窗已初始化并显示，首次挑战状态:', this.data.isChallengeFirstTime);
      
      // 隐藏加载提示
      wx.hideLoading();
    }).catch(error => {
      console.error('加载挑战数据失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载挑战数据失败',
        icon: 'none',
        duration: 2000
      });
    });
  },
  

    

  
  // 初始化带答案的拼图游戏
  initPuzzleGameWithAnswers: function(answers) {
    console.log('[拼图调试] 开始初始化带答案的拼图游戏，答案:', answers);
    
    // 使用固定默认答案序列
    const puzzleAnswers = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    console.log('[拼图调试] 使用的拼图答案序列:', puzzleAnswers);
    
    // 创建拼图槽位数组 - 3x3网格
    const puzzleSlots = Array(9).fill().map((_, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      return {
        index: i,
        row: row,
        col: col,
        filled: false,
        pieceIndex: null,
        correct: false
      };
    });
    
    // 创建拼图碎片数组 - 使用固定答案设置位置
    const puzzlePieces = Array(9).fill().map((_, i) => {
      const originalIndex = puzzleAnswers[i];
      const row = Math.floor(originalIndex / 3);
      const col = originalIndex % 3;
      return {
        index: i,
        originalIndex: originalIndex,
        row: row,
        col: col,
        placed: false,
        x: 0,
        y: 0
      };
    });
    
    console.log('[拼图调试] 创建了', puzzleSlots.length, '个槽位和', puzzlePieces.length, '个碎片');
    console.log('[拼图调试] 碎片正确位置映射:', puzzlePieces.map(p => `碎片${p.index}->位置${p.originalIndex}`));
    
    // 洗牌拼图碎片
    console.log('[拼图调试] 洗牌前碎片顺序:', puzzlePieces.map(p => `碎片${p.index}(正确位置${p.originalIndex})`));
    this.shuffleArray(puzzlePieces);
    console.log('[拼图调试] 洗牌后碎片顺序:', puzzlePieces.map(p => `碎片${p.index}(正确位置${p.originalIndex})`));
    console.log('[拼图调试] 拼图碎片已洗牌');
    
    // 设置初始状态
    this.setData({
      puzzleSlots: puzzleSlots,
      puzzlePieces: puzzlePieces,
      selectedPieceIndex: null,
      puzzleComplete: false,
      puzzleAllPlaced: false,
      showPuzzleNumbers: true, // 始终显示编号方便用户
      enableDrag: true
    });
    
    console.log('拼图游戏已使用后台答案初始化，3x3网格创建完成，显示编号:', puzzleAnswers);
  },
  
  // 打乱拼图（确保可解）
  shufflePuzzle: function(pieces) {
    const validMoves = 30; // 执行的有效移动次数
    let emptyIndex = 8; // 空白块的初始位置
    
    for (let i = 0; i < validMoves; i++) {
      // 获取空白块的邻居
      const neighbors = this.getNeighbors(emptyIndex);
      // 随机选择一个邻居
      const randomNeighborIndex = neighbors[Math.floor(Math.random() * neighbors.length)];
      // 交换空白块和选中的邻居
      [pieces[emptyIndex], pieces[randomNeighborIndex]] = [pieces[randomNeighborIndex], pieces[emptyIndex]];
      // 更新空白块位置
      emptyIndex = randomNeighborIndex;
    }
    
    // 更新currentIndex
    for (let i = 0; i < pieces.length; i++) {
      pieces[i].currentIndex = i;
    }
  },

  // 获取给定位置的相邻块的索引
  getNeighbors: function(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const neighbors = [];
    
    // 上方块
    if (row > 0) neighbors.push(index - 3);
    // 下方块
    if (row < 2) neighbors.push(index + 3);
    // 左方块
    if (col > 0) neighbors.push(index - 1);
    // 右方块
    if (col < 2) neighbors.push(index + 1);
    
    return neighbors;
  },

  // 关闭挑战弹窗
  closeChallenge: function() {
    this.setData({
      showChallenge: false
    });
    
    // 等待动画结束后重置挑战步骤
    setTimeout(() => {
      this.setData({
        challengeStep: 1,
        'singleQuestion.selectedOption': null,
        'singleQuestion.showResult': false,
        'multiQuestion.hasSelected': false,
        'multiQuestion.selectedOptions': Array(this.data.multiQuestion.options.length).fill(false),
        'multiQuestion.showResult': false
      });
    }, 300);
  },

  // 选择单选题选项
  selectSingleOption: function(e) {
    const selectedIndex = parseInt(e.currentTarget.dataset.index);
    
    // 只选择选项，不立即判断结果
    this.setData({
      'singleQuestion.selectedOption': selectedIndex
    });
  },

  // 提交单选题答案
  submitSingleAnswer: function() {
    const selectedIndex = this.data.singleQuestion.selectedOption;
    const correctOption = this.data.singleQuestion.correctOption;
    const isCorrect = selectedIndex === correctOption;
    
    // 判断结果
    this.setData({
      'singleQuestion.showResult': true,
      'singleQuestion.isCorrect': isCorrect
    });
    
    // 显示简短的回答反馈
    wx.showToast({
      title: isCorrect ? '回答正确！' : '回答错误',
      icon: isCorrect ? 'success' : 'error',
      duration: 1000
    });
  },

  // 选择多选题选项
  selectMultiOption: function(e) {
    const selectedIndex = e.currentTarget.dataset.index;
    const currentValue = this.data.multiQuestion.selectedOptions[selectedIndex];
    
    // 更新选中状态
    const newSelectedOptions = [...this.data.multiQuestion.selectedOptions];
    newSelectedOptions[selectedIndex] = !currentValue;
    
    // 检查是否至少选择了一项
    const hasSelected = newSelectedOptions.some(item => item);
    
    this.setData({
      'multiQuestion.selectedOptions': newSelectedOptions,
      'multiQuestion.hasSelected': hasSelected
    });
  },

  // 提交多选题答案
  submitMultiAnswer: function() {
    // 检查多选题答案是否正确
    let multiCorrect = true;
    const selectedOptions = this.data.multiQuestion.selectedOptions;
    const correctOptions = this.data.multiQuestion.correctOptions;
    
    for (let i = 0; i < selectedOptions.length; i++) {
      if (selectedOptions[i] !== correctOptions[i]) {
        multiCorrect = false;
        break;
      }
    }
    
    this.setData({
      'multiQuestion.showResult': true,
      'multiQuestion.isCorrect': multiCorrect
    });
    
    // 显示答题结果提示
    wx.showToast({
      title: multiCorrect ? '回答正确！' : '回答错误',
      icon: multiCorrect ? 'success' : 'error',
      duration: 1500
    });
    
    // 不再自动跳转，让用户点击"下一题"按钮继续
    // setTimeout(() => {
    //   this.nextChallengeStep();
    // }, 2000);
  },

  // 下一步挑战
  nextChallengeStep: function() {
    const currentStep = this.data.challengeStep;
    
    // 在步骤1（单选题）
    if (currentStep === 1) {
      // 如果没有选择或尚未显示结果，不继续
      if (this.data.singleQuestion.selectedOption === null && !this.data.singleQuestion.showResult) {
        wx.showToast({
          title: '请先选择一个选项',
          icon: 'none',
          duration: 1500
        });
        return;
      }
      
      this.setData({
        challengeStep: 2, // 进入多选题
        'singleQuestion.showResult': false // 重置结果显示
      });
    }
    // 在步骤2（多选题）
    else if (currentStep === 2) {
      // 如果没有选择且尚未显示结果，不继续
      if (!this.data.multiQuestion.hasSelected && !this.data.multiQuestion.showResult) {
        wx.showToast({
          title: '请至少选择一个选项',
          icon: 'none',
          duration: 1500
        });
        return;
      }
      
      // 如果是用户手动点击下一题（而不是自动跳转）且尚未显示结果
      if (!this.data.multiQuestion.showResult) {
        this.submitMultiAnswer();
        return;
      }
      
      this.setData({
        challengeStep: 3, // 进入拼图步骤
        'multiQuestion.showResult': false // 重置结果显示
      });
      
      // 初始化九宫格拼图游戏
      const puzzleData = initPuzzleGame();
      // 使用城市数据中的拼图图片，如果没有则使用默认图片
      const puzzleImageUrl = this.data.selectedCity?.challenges?.puzzleGame?.puzzleImageUrl || 
        this.data.puzzleImageUrl || 'https://via.placeholder.com/300x300.png?text=Puzzle';
      
      this.setData({
        puzzlePieces: puzzleData.puzzlePieces,
        puzzleSlots: puzzleData.puzzleSlots,
        selectedPieceIndex: puzzleData.selectedPieceIndex,
        showPuzzleNumbers: puzzleData.showPuzzleNumbers,
        puzzleImageUrl: puzzleImageUrl
      });
    }
    // 在步骤3（拼图）
    else if (currentStep === 3) {
      // 验证拼图完成情况
      const isPuzzleComplete = checkPuzzleComplete.call(this);
      
      // 无论拼图是否完成，都直接进入结果页
      // 用户通过点击按钮主动选择进入结果页
      this.calculateResults();
      this.setData({
        challengeStep: 4, // 进入结果页
        puzzleComplete: isPuzzleComplete // 记录拼图完成情况
      });
    }
    // 在步骤4（结果页）
    else if (currentStep === 4) {
      this.setData({
        showChallenge: false
        // 移除 showResult: true 以避免重复显示结果
      });
    }
  },

  // 计算结果
  calculateResults: function() {
    let treesEarned = 0;
    
    // 先确保保存当前的首次挑战状态，用于显示结果
    const isFirstChallenge = this.data.isChallengeFirstTime;
    
    // 获取用户登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      // 用户未登录，提示登录
      wx.showModal({
        title: '提示',
        content: '登录后才能获得小树奖励哦',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 跳转到个人主页进行登录
            wx.switchTab({
              url: '/pages/cloudDwelling/index'
            });
          }
        }
      });
      this.setData({
        earnedTrees: 0,
        isFirstAttempt: false
      });
      return;
    }

    // 判断是否为首次挑战，只有首次才能获得小树
    if (isFirstChallenge) {
      // 单选题判断
      const singleCorrect = this.data.singleQuestion.selectedOption === this.data.singleQuestion.correctOption;
      
      // 多选题判断
      let multiCorrect = true;
      const selectedOptions = this.data.multiQuestion.selectedOptions;
      const correctOptions = this.data.multiQuestion.correctOptions;
      
      for (let i = 0; i < selectedOptions.length; i++) {
        if (selectedOptions[i] !== correctOptions[i]) {
          multiCorrect = false;
          break;
        }
      }
      
      // 拼图判断
      const puzzleComplete = this.data.puzzleComplete || false;
      
      // 记录各题目答题情况，用于结果页显示
      const resultDetails = {
        singleCorrect: singleCorrect,
        multiCorrect: multiCorrect,
        puzzleComplete: puzzleComplete
      };
      
      // 根据答题情况计算获得的树木数量
      if (singleCorrect) treesEarned += 1; // 单选题答对得1颗树
      if (multiCorrect) treesEarned += 2; // 多选题答对得2颗树
      if (puzzleComplete) treesEarned += 3; // 拼图完成得3颗树
      
      // 更新本地和全局的树木计数
      if (treesEarned > 0) {
        const app = getApp();
        // 获取当前TimeSequence树木数量
        const currentTimeSequenceTrees = (app.globalData && app.globalData.timeSequenceTrees) || 0;
        const newTimeSequenceTrees = currentTimeSequenceTrees + treesEarned;
        
        if (app.globalData) {
          // 更新TimeSequence树木数量
          app.globalData.timeSequenceTrees = newTimeSequenceTrees;
          // 更新总树木数量
          const lantingTrees = app.globalData.lantingTrees || 0;
          const consumedTrees = app.globalData.consumedTrees || 0;
          app.globalData.treeCount = lantingTrees + newTimeSequenceTrees - consumedTrees;
        }
        
        // 更新本地存储
        wx.setStorageSync('timeSequenceTrees', newTimeSequenceTrees);
        wx.setStorageSync('treeCount', app.globalData.treeCount);

        // 更新云数据库中的用户树木数量 - 使用跨环境调用
        // 创建跨环境调用的Cloud实例
        var c = new wx.cloud.Cloud({ 
          // 必填，表示是未登录模式 
          identityless: true, 
          // 资源方 AppID 
          resourceAppid: 'wx85d92d28575a70f4', 
          // 资源方环境 ID 
          resourceEnv: 'cloud1-1gsyt78b92c539ef', 
        }); 
        c.init().then(() => {
          return c.callFunction({
            name: 'xsj_auth',
            data: {
              action: 'updateUserInfo',
              data: {
                timeSequenceTrees: newTimeSequenceTrees,
                treeCount: app.globalData.treeCount
              }
            }
          });
        }).then(res => {
          if (!res.result.success) {
            console.error('更新云数据库树木数量失败:', res);
          }
        }).catch(err => {
          console.error('调用云函数更新树木数量失败:', err);
        });
        // 记录完成挑战活动，使用实际获得的树苗数量 - 使用跨环境调用
        // 创建跨环境调用的Cloud实例
        var c2 = new wx.cloud.Cloud({ 
          // 必填，表示是未登录模式 
          identityless: true, 
          // 资源方 AppID 
          resourceAppid: 'wx85d92d28575a70f4', 
          // 资源方环境 ID 
          resourceEnv: 'cloud1-1gsyt78b92c539ef', 
        }); 
        c2.init().then(() => {
          return c2.callFunction({
            name: 'xsj_auth',
            data: {
              action: 'recordUserActivity',
              description: `完成了"${this.data.selectedCity.name}"的城市挑战`,
              type: 'challenge',
              reward: treesEarned // 使用实际获得的树苗数量
            }
          });
        }).catch(err => {
          console.error('记录挑战活动失败:', err);
        });
      }
    }
    
    this.setData({
      earnedTrees: treesEarned,
      // 保持原始的首次挑战状态用于结果显示
      isFirstAttempt: isFirstChallenge
    });
    
    // 无论是否获得小树，都记录完成记录
    const selectedCity = this.data.selectedCity;
    
    // 如果是首次挑战，添加到已完成挑战记录
    if (isFirstChallenge) {
      let completedChallenges = this.data.completedChallenges || [];
      
      // 确保completedChallenges是一个数组
      if (!Array.isArray(completedChallenges)) {
        console.error('calculateResults: completedChallenges不是数组，重置为空数组');
        completedChallenges = [];
      }
      
      completedChallenges.push({
        cityId: selectedCity.id,
        cityName: selectedCity.name,
        completedDate: new Date().toISOString(),
        treesEarned: treesEarned
      });
      
      // 保存到本地存储
      wx.setStorageSync('completed_challenges', completedChallenges);
      
      // 更新数据 - 但要在设置完isFirstAttempt后再更新isChallengeFirstTime
      this.setData({
        completedChallenges: completedChallenges,
        // 注意：这里不要急着更新首次挑战的状态
        isChallengeFirstTime: false // 完成后标记为非首次
      });
    }
    
    // 测试模式下的日志输出
    console.log('挑战结果计算完成:', {
      首次挑战: isFirstChallenge,
      树木奖励: treesEarned,
      状态保存用于显示: this.data.isFirstAttempt
    });
  },

  // 关闭结果弹窗
  closeResult: function() {
    this.setData({
      showResult: false
    });
    
    // TODO: 刷新页面显示最新的树木数量
  },

  // 添加一个直接测试函数，用于在控制台调用测试
  testChallenge: function() {
    console.log('直接测试挑战弹窗显示');
    // 简化的测试，只设置显示标志
    this.setData({
      showChallenge: true,
      challengeStep: 1 
    });
    console.log('测试完成，showChallenge=', this.data.showChallenge);
  },
  
  // 打乱数组顺序
  shuffleArray: function(array) {
    console.log('[拼图调试] 开始打乱数组，原始长度:', array.length);
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    console.log('[拼图调试] 数组打乱完成');
    return array;
  },

// 初始化简单拼图
initSimplePuzzle: function() {
    console.log('[拼图调试] 开始初始化简单拼图游戏...');
    
    // 创建拼图槽位数组 - 3x3网格
    const puzzleSlots = [];
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      puzzleSlots.push({
        index: i,
        row: row,
        col: col,
        filled: false,
        pieceIndex: null,
        correct: false
      });
    }
    
    // 创建拼图碎片数组 - 每个碎片代表图片的第i个区域
    const puzzlePieces = [];
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      puzzlePieces.push({
        id: i, // 碎片的唯一标识，代表图片的第i个区域
        correctSlot: i, // 这个碎片应该放在第i个槽位
        row: row,
        col: col,
        placed: false,
        x: 0,
        y: 0
      });
    }
    
    console.log('[拼图调试] 创建了', puzzleSlots.length, '个槽位和', puzzlePieces.length, '个碎片');
    
    // 洗牌拼图碎片 - 保证已经创建了9个碎片
    if (puzzlePieces.length === 9) {
      console.log('[拼图调试] 洗牌前碎片顺序:', puzzlePieces.map(p => `碎片${p.id}(应放槽位${p.correctSlot})`));
      this.shuffleArray(puzzlePieces);
      console.log('[拼图调试] 洗牌后碎片顺序:', puzzlePieces.map(p => `碎片${p.id}(应放槽位${p.correctSlot})`));
      
      // 生成答案数组：索引代表卡槽位置，值是该卡槽应放置的卡片编号
      const answerArray = puzzlePieces.map(piece => piece.id + 1); // 使用卡片编号(1-9)
      console.log('[拼图调试] 答案数组:', answerArray);
      console.log('[拼图调试] 答案数组解释:', answerArray.map((cardNum, slotIndex) => `${slotIndex}号卡槽应放置${cardNum}号卡片`));
      
      // 设置初始状态
      this.setData({
        puzzleSlots: puzzleSlots,
        puzzlePieces: puzzlePieces,
        answerArray: answerArray, // 新的答案数组
        selectedPieceIndex: null,
        puzzleComplete: false,
        puzzleAllPlaced: false,
        showPuzzleNumbers: true,
        // 确保图片URL可用
        puzzleImageUrl: this.data.puzzleImageUrl || this.data.selectedCity?.iconUrl || "https://img.xianjichina.com/editer/20220720/image/1d60e05a779b9dcc3bff1bdf59d5f93d.jpg"
      });
      
    } else {
      console.error('[拼图调试] 拼图碎片数量不正确:', puzzlePieces.length);
    }
    
      // 确认所有数据都已正确设置
      console.log('[拼图调试] 拼图槽位数:', this.data.puzzleSlots.length);
      console.log('[拼图调试] 拼图碎片数:', this.data.puzzlePieces.length);
    console.log('[拼图调试] 简单拼图游戏初始化完成');
  },
  
  // 检查拼图是否完成
  checkPuzzleCompletion: function() {
    const puzzleSlots = this.data.puzzleSlots;
    console.log('[拼图调试] 开始检查拼图完成状态，槽位数量:', puzzleSlots.length);
    
    // 检查拼图是否完成
    let complete = true;
    let allPlaced = true;
    let correctCount = 0;
    let filledCount = 0;
    
    for (let i = 0; i < puzzleSlots.length; i++) {
      // 检查是否所有槽位都已填充
      if (!puzzleSlots[i].filled) {
        allPlaced = false;
      } else {
        filledCount++;
      }
      
      // 检查是否所有填充的槽位都正确
      if (!puzzleSlots[i].filled || !puzzleSlots[i].correct) {
        complete = false;
      } else if (puzzleSlots[i].correct) {
        correctCount++;
      }
    }
    
    console.log('[拼图调试] 检查结果 - 已填充:', filledCount, '正确:', correctCount, '全部放置:', allPlaced, '完成:', complete);
    
    this.setData({
      puzzleComplete: complete,
      puzzleAllPlaced: allPlaced
    });
    
    // 如果拼图完成，显示成功提示
    if (complete) {
      console.log('[拼图调试] 拼图已完成！');
    }
    
    // 返回拼图完成状态
    return complete;
  },
  
  // 获取拼图碎片的背景位置
  getPiecePosition: function(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    // 返回object-position属性值，使用百分比定位
    return `${col * 50}% ${row * 50}%`;
  },
  
  // 点击拼图碎片
  onPieceTap: function(e) {
    if (this.data.challengeStep !== 3) return; // 只在拼图步骤才响应
    
    const pieceIndex = parseInt(e.currentTarget.dataset.index);
    
    // 获取当前所有拼图状态
    const puzzlePieces = [...this.data.puzzlePieces];
    
    console.log('[拼图调试] 点击拼图碎片:', pieceIndex, '(卡片编号:', puzzlePieces[pieceIndex] ? puzzlePieces[pieceIndex].id + 1 : '未知', ')');
    
    if (isNaN(pieceIndex) || pieceIndex < 0 || pieceIndex >= 9) {
      console.error('[拼图调试] 无效的拼图索引:', pieceIndex, e);
      return;
    }
    
    // 确保拼图数组存在且索引有效
    if (!puzzlePieces || !puzzlePieces[pieceIndex]) {
      console.error('[拼图调试] 拼图数据异常:', puzzlePieces, pieceIndex);
      return;
    }
    
    // 如果碎片已经放置，则不响应
    if (puzzlePieces[pieceIndex].placed) {
      console.log('[拼图调试] 碎片已放置，无法点击');
      return;
    }
    
    // 选中碎片 - 无论此前是否已选中都重新选中
    this.setData({
      selectedPieceIndex: pieceIndex
    });
    
    console.log('[拼图调试] 成功选中碎片:', pieceIndex, '(卡片编号:', puzzlePieces[pieceIndex].id + 1, ') 正确槽位应该是:', puzzlePieces[pieceIndex].correctSlot);
    
    // 提供触感和视觉反馈
    
    
    console.log('成功选中碎片:', pieceIndex, '(卡片编号:', puzzlePieces[pieceIndex].id + 1, ')');
  },
  
  // 点击拼图槽位
  onSlotTap: function(e) {
    if (this.data.challengeStep !== 3) return; // 只在拼图步骤才响应
    
    const slotIndex = parseInt(e.currentTarget.dataset.index);
    const selectedPieceIndex = this.data.selectedPieceIndex;
    
    console.log('[拼图调试] 点击拼图槽位:', slotIndex, '(显示编号:', slotIndex + 1, ') 选中碎片:', selectedPieceIndex);
    console.log('[拼图调试] 槽位数据:', this.data.puzzleSlots[slotIndex]);
    
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= 9) {
      console.error('[拼图调试] 无效的槽位索引:', slotIndex);
      return;
    }
    
    // 获取拼图数据
    const puzzlePieces = [...this.data.puzzlePieces];
    const puzzleSlots = [...this.data.puzzleSlots];
    
    // 确保数据有效
    if (!puzzleSlots[slotIndex]) {
      console.error('槽位数据异常:', slotIndex);
      return;
    }
    
    // 如果槽位有碎片且没有选中的碎片，则取出该碎片
    if (puzzleSlots[slotIndex].filled && selectedPieceIndex === null) {
      const pieceIndex = puzzleSlots[slotIndex].pieceIndex;
      
      if (pieceIndex !== null && pieceIndex >= 0 && pieceIndex < puzzlePieces.length) {
        // 移除槽位中的碎片
        puzzleSlots[slotIndex].filled = false;
        puzzleSlots[slotIndex].pieceIndex = null;
        puzzleSlots[slotIndex].correct = false;
        
        // 更新碎片状态
        puzzlePieces[pieceIndex].placed = false;
        
        this.setData({
          puzzleSlots: puzzleSlots,
          puzzlePieces: puzzlePieces
        });
        
        
        console.log('已取出碎片:', pieceIndex, '从槽位:', slotIndex);
      } else {
        console.error('无效的碎片索引:', pieceIndex);
      }
      return;
    }
    
    // 如果选中了碎片，将其放入槽位
    if (selectedPieceIndex !== null) {
      // 直接调用放置函数
      console.log('[拼图调试] 将碎片', selectedPieceIndex, '放入槽位', slotIndex, '(显示编号:', slotIndex + 1, ')');
      this.placePieceToSlot(selectedPieceIndex, slotIndex);
      
      
      return;
    }
    
    
  },
  
  // 输入拼图编号直接放置
  onPieceNumberInput: function(e) {
    if (this.data.challengeStep !== 3) return; // 只在拼图步骤才响应
    
    const pieceIndex = parseInt(e.currentTarget.dataset.pieceIndex);
    const inputValue = e.detail.value.trim();
    const slotNumber = parseInt(inputValue);
    
    // 检查输入是否有效（1-9之间的数字）
    if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > 9) {
      return; // 输入不合法，不处理
    }
    
    // 立即放置碎片
    this.placePieceToSlot(pieceIndex, slotNumber - 1);
  },

  // 确认输入拼图编号
  onPieceNumberConfirm: function(e) {
    if (this.data.challengeStep !== 3) return; // 只在拼图步骤才响应
    
    const pieceIndex = parseInt(e.currentTarget.dataset.pieceIndex);
    const inputValue = e.detail.value.trim();
    const slotNumber = parseInt(inputValue);
    
    // 检查输入是否有效（1-9之间的数字）
    if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > 9) {
      wx.showToast({
        title: '请输入1-9的数字',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    // 放置碎片到对应位置
    this.placePieceToSlot(pieceIndex, slotNumber - 1);
  },

  // 将碎片放置到指定槽位
  placePieceToSlot: function(pieceIndex, slotIndex) {
    console.log('[拼图调试] 放置拼图碎片:', pieceIndex, '到槽位:', slotIndex, '(显示编号:', slotIndex + 1, ')');
    
    try {
      // 如果参数是事件对象，则从事件对象中提取索引
      if (typeof pieceIndex === 'object' && pieceIndex.currentTarget) {
        const event = pieceIndex;
        pieceIndex = parseInt(event.currentTarget.dataset.pieceIndex);
        slotIndex = parseInt(event.currentTarget.dataset.slotIndex);
        console.log('[拼图调试] 从事件对象提取索引 - 碎片:', pieceIndex, '槽位:', slotIndex);
      }
      
      // 确保索引是有效的数字
      pieceIndex = parseInt(pieceIndex);
      slotIndex = parseInt(slotIndex);
      
      if (isNaN(pieceIndex) || isNaN(slotIndex)) {
        console.error('[拼图调试] 无效的拼图或槽位索引:', pieceIndex, slotIndex);
        return;
      }
      
      // 获取数据
      const puzzlePieces = [...this.data.puzzlePieces];
      const puzzleSlots = [...this.data.puzzleSlots];
      
      // 确保数组和索引有效
      if (!puzzlePieces[pieceIndex] || !puzzleSlots[slotIndex]) {
        console.error('[拼图调试] 拼图碎片或槽位不存在:', pieceIndex, slotIndex);
        return;
      }
      
      // 获取答案数组
      const answerArray = this.data.answerArray;
      console.log('[拼图调试] 当前答案数组:', answerArray);
      
      // 如果该碎片已经放置在其他槽位中，先移除
      for (let i = 0; i < puzzleSlots.length; i++) {
        if (puzzleSlots[i].filled && puzzleSlots[i].pieceIndex === pieceIndex) {
          console.log('[拼图调试] 从槽位', i, '移除碎片', pieceIndex);
          puzzleSlots[i].filled = false;
          puzzleSlots[i].pieceIndex = null;
          puzzleSlots[i].correct = false;
        }
      }
      
      // 如果目标槽位已经有碎片，先移除
      if (puzzleSlots[slotIndex].filled) {
        const oldPieceIndex = puzzleSlots[slotIndex].pieceIndex;
        if (oldPieceIndex !== null && puzzlePieces[oldPieceIndex]) {
          console.log('[拼图调试] 从槽位', slotIndex, '移除现有碎片', oldPieceIndex);
          puzzlePieces[oldPieceIndex].placed = false;
        }
      }
      
      // 更新槽位和碎片状态
      puzzleSlots[slotIndex].filled = true;
      puzzleSlots[slotIndex].pieceIndex = pieceIndex;
      puzzlePieces[pieceIndex].placed = true;
      
      // 设置碎片在槽位中的显示方式
      puzzleSlots[slotIndex].row = puzzlePieces[pieceIndex].row;
      puzzleSlots[slotIndex].col = puzzlePieces[pieceIndex].col;
      
      // 检查是否放置正确
      // 使用新的答案数组逻辑：answerArray[slotIndex] 应该等于 卡片编号(id + 1)
      const cardNumber = puzzlePieces[pieceIndex].id + 1;
      const isCorrect = (answerArray && answerArray[slotIndex] === cardNumber);
      puzzleSlots[slotIndex].correct = isCorrect;
      
      console.log(`[拼图调试] 卡片${cardNumber}放置到槽位${slotIndex}，答案数组显示该槽位应放置卡片${answerArray ? answerArray[slotIndex] : '未知'}，是否正确：${isCorrect}`);
      console.log(`[拼图调试] 验证详情: answerArray[${slotIndex}] = ${answerArray ? answerArray[slotIndex] : '未知'}, cardNumber = ${cardNumber}`);
      
      // 更新数据
      this.setData({
        puzzlePieces: puzzlePieces,
        puzzleSlots: puzzleSlots,
        selectedPieceIndex: null // 放置后取消选中状态
      });
      
      console.log('[拼图调试] 数据已更新，取消选中状态');
      
      
      
    
    } catch (error) {
      console.error('[拼图调试] 放置拼图出错:', error);
    }
  },

  // 打开城市博物馆
  openCityMuseum: function() {
    // Note: Button removed from main UI, function remains for potential future use
    // Hide the city detail content and show the museum content
    this.setData({
      showCityMuseum: true
    });
    
    console.log('城市博物馆已打开');
    
    // If needed, we can load dynamic museum content here
    // For example, fetching museum data from an API
  },

  // 拼图移动处理函数
  onPieceMove: function(e) {
    if (this.data.challengeStep !== 3) return;
    
    const pieceIndex = e.currentTarget.dataset.index;
    
    // 更新碎片位置
    const puzzlePieces = [...this.data.puzzlePieces];
    puzzlePieces[pieceIndex].x = e.detail.x;
    puzzlePieces[pieceIndex].y = e.detail.y;
    
    this.setData({
      puzzlePieces: puzzlePieces
    });
  },

  // 拼图移动结束
  onPieceMoveEnd: function(e) {
    if (this.data.challengeStep !== 3) return;
    
    const pieceIndex = e.currentTarget.dataset.index;
    
    // 使用选择器获取所有槽位的位置
    wx.createSelectorQuery()
      .selectAll('.puzzle-slot')
      .boundingClientRect((slots) => {
        if (!slots || slots.length === 0) return;
        
        // 获取移动视图位置
        wx.createSelectorQuery()
          .select(`.puzzle-piece-movable[data-index="${pieceIndex}"]`)
          .boundingClientRect((piece) => {
            if (!piece) return;
            
            // 计算碎片中心点
            const pieceCenterX = piece.left + piece.width / 2;
            const pieceCenterY = piece.top + piece.height / 2;
            
            // 查找最近的槽位
            let closestSlot = -1;
            let minDistance = Number.MAX_VALUE;
            
            slots.forEach((slot, index) => {
              const slotCenterX = slot.left + slot.width / 2;
              const slotCenterY = slot.top + slot.height / 2;
              const distance = Math.sqrt(
                Math.pow(pieceCenterX - slotCenterX, 2) + 
                Math.pow(pieceCenterY - slotCenterY, 2)
              );
              
              if (distance < minDistance) {
                minDistance = distance;
                closestSlot = index;
              }
            });
            
            // 如果足够近，放置碎片
            if (closestSlot >= 0 && minDistance < piece.width) {
              // 放置碎片到槽位
              this.placePieceToSlot(pieceIndex, closestSlot);
            } else {
              // 如果没有放置成功，将碎片移回原位
              const puzzlePieces = [...this.data.puzzlePieces];
              puzzlePieces[pieceIndex].x = 0;
              puzzlePieces[pieceIndex].y = 0;
              this.setData({
                puzzlePieces: puzzlePieces
              });
            }
          })
          .exec();
      })
      .exec();
  },

  // 碎片触摸处理（作为点击的备用处理）
  onPieceTapTouch: function(e) {
    if (this.data.challengeStep !== 3) return;
    
    const pieceIndex = parseInt(e.currentTarget.dataset.index);
    console.log('触摸拼图碎片:', pieceIndex);
    
    // 如果不是长按，则直接调用点击处理
    this.onPieceTap(e);
    
    // 使用catch:tap代替阻止冒泡
    // e.stopPropagation(); // 移除这行
  },

  // 拼图块点击处理


  /**
   * 加载城市数据
   */
  loadCitiesData: async function() {
    console.log('开始加载城市数据');
    
    try {
      // 显示加载进度
      this.setData({
        isLoading: true,
        loadingProgress: 20
      });

      // 总是重新生成当前月份的城市数据，确保更新
      const cities = await generateCities(this.data.currentYear, this.data.currentMonth);
      console.log('生成的城市数量:', cities.length);
      console.log('当前月份:', this.data.currentMonth);
      
      this.setData({
        loadingProgress: 60
      });
      
      // 计算分页信息
      const totalPages = Math.ceil(cities.length / this.data.citiesPerPage);
      console.log('总页数:', totalPages);
      
      // 更新数据
      this.setData({
        allCities: cities,
        totalPages: Math.max(1, totalPages),
        currentPage: 1,
        unlockedCitiesCount: cities.filter(city => city.unlocked).length,
        loadingProgress: 80
      });
      
      // 更新显示的城市
      this.updateDisplayedCities();
      
      // 完成加载
      this.setData({
        isLoading: false,
        loadingProgress: 100
      });
      
      console.log('城市数据加载完成');
    } catch (error) {
      console.error('加载城市数据出错:', error);
      // 出错时显示提示
      wx.showToast({
        title: '加载城市数据失败，请重试',
        icon: 'none',
        duration: 3000
      });
    
      // 重置加载状态
      this.setData({
        isLoading: false,
        loadingProgress: 0
      });
    }
  },

  /**
   * 更新当前页显示的城市
   */
  updateDisplayedCities: function() {
    try {
      const { allCities, currentPage, citiesPerPage } = this.data;
      const startIndex = (currentPage - 1) * citiesPerPage;
      const endIndex = startIndex + citiesPerPage;
      
      if (!allCities || !Array.isArray(allCities)) {
        console.error('allCities不是数组或为空:', allCities);
        return;
      }
      
      // 提取当前页的城市
      const displayedCities = allCities.slice(startIndex, endIndex);
      console.log('当前页显示城市数:', displayedCities.length);
      
      // 更新显示的城市
      this.setData({
        displayedCities: displayedCities
      });
    } catch (error) {
      console.error('更新显示城市时出错:', error);
    }
  },

  /**
   * 初始化轮播图片
   */
  initScenicImages: async function() {
    console.log('初始化轮播图片');
    try {
      // 从云数据库获取轮播图数据 - 使用跨环境调用
      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({ 
        // 必填，表示是未登录模式 
        identityless: true, 
        // 资源方 AppID 
        resourceAppid: 'wx85d92d28575a70f4', 
        // 资源方环境 ID 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      }); 
      await c.init();
      await c.callFunction({
        name: 'roaming',
        data: {
          action: 'initMonthlyCarousel'
        }
      });
      
      // 获取轮播图数据
      await this.fetchMonthlyCarousel();
    } catch (err) {
      console.error('初始化月份轮播图集合失败:', err);
      // 使用模拟数据作为备选
      this.setData({
        scenicImages: this.getMockScenicImages()
      });
    }
  },

  // 初始化视频上下文
  initVideoContext: function() {
    if (!this.videoContext) {
      this.videoContext = wx.createVideoContext('cityVideo', this);
    }
  },

  // 在页面隐藏时清理视频上下文
  onHide: function() {
    if (this.videoContext) {
      this.videoContext = null;
    }
  },

  // 视频播放事件处理
  onVideoPlay: function() {
    console.log('视频开始播放');
  },

  onVideoPause: function() {
    console.log('视频暂停');
  },

  onVideoEnded: function() {
    console.log('视频播放结束');
    this.setData({
      isVideoFullscreen: false
    });
  },

  onVideoTimeUpdate: function(e) {
    // console.log('视频播放进度更新:', e.detail.currentTime);
  },

  onVideoWaiting: function() {
    console.log('视频缓冲中');
    wx.showToast({
      title: '视频加载中...',
      icon: 'loading',
      duration: 1000
    });
  },

  // 视频进入和退出全屏时的处理
  onVideoFullscreenChange: function(e) {
    const isFullscreen = e.detail.fullScreen;
    console.log('全屏状态改变：', isFullscreen);
    this.setData({
      isVideoFullscreen: isFullscreen
    });
  },

  // 预览图片
  previewImage: function(e) {
    const current = e.currentTarget.dataset.current; // 当前图片
    const urls = e.currentTarget.dataset.urls; // 所有图片的数组
    
    wx.previewImage({
      current: current,
      urls: urls,
      showmenu: true, // 显示长按菜单，可以保存图片
      success: function(res) {
        console.log('预览图片成功');
      },
      fail: function(res) {
        console.error('预览图片失败:', res);
        wx.showToast({
          title: '预览失败',
          icon: 'none'
        });
      }
    });
  },

  // 音频相关方法
  initAudioContext: async function() {
    console.log('初始化音频上下文:', this.data.selectedCity);
    
    // 销毁旧的音频上下文
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
    
    if (this.data.selectedCity && this.data.selectedCity.audioUrl) {
      console.log('准备加载音频:', this.data.selectedCity.audioUrl);
      
      // 创建音频上下文
      const audioContext = wx.createInnerAudioContext();
      
      // 处理音频源 - 使用统一的getTemporaryImageUrl函数
      const audioSrc = await getTemporaryImageUrl(this.data.selectedCity.audioUrl, 'audio');
      if (!audioSrc) {
        wx.showToast({
          title: '音频加载失败',
          icon: 'none'
        });
        return;
      }
      
      // 设置音频源
      audioContext.src = audioSrc;
      // 设置播放速度
      audioContext.playbackRate = this.data.audioPlaybackRate;
      console.log('设置音频源完成:', audioSrc, '播放速度:', this.data.audioPlaybackRate);
      
      // 监听音频事件
      audioContext.onCanplay(() => {
        console.log('音频加载完成，可以播放');
        // 获取音频总时长
        const duration = audioContext.duration;
        const durationStr = this.formatTime(duration);
        this.setData({
          audioDuration: duration,
          durationStr: durationStr
        });
      });
      
      audioContext.onPlay(() => {
        console.log('音频开始播放');
        this.setData({ 
          isPlaying: true,
          showAudioPlayer: true
        });
      });
      
      audioContext.onPause(() => {
        console.log('音频暂停');
        this.setData({ isPlaying: false });
      });
      
      audioContext.onTimeUpdate(() => {
        // 获取当前播放时间和总时长
        const currentTime = audioContext.currentTime;
        const duration = audioContext.duration;
        
        // 格式化时间显示
        const currentTimeStr = this.formatTime(currentTime);
        const durationStr = this.formatTime(duration);
        
        this.setData({
          currentTime: currentTime,
          audioDuration: duration,
          currentTimeStr: currentTimeStr,
          durationStr: durationStr
        });
      });
      
      audioContext.onEnded(() => {
        console.log('音频播放结束');
        this.setData({ 
          isPlaying: false,
          currentTime: 0,
          currentTimeStr: '00:00',
          showAudioPlayer: false
        });
      });
      
      audioContext.onError((err) => {
        console.error('音频播放错误:', err);
        wx.showToast({
          title: '音频加载失败',
          icon: 'none'
        });
        
        this.setData({
          isPlaying: false,
          currentTime: 0,
          currentTimeStr: '00:00',
          audioDuration: 0,
          durationStr: '00:00',
          showAudioPlayer: false
        });
      });
      
      this.setData({ audioContext });
    }
  },

  // 格式化时间为 mm:ss 格式
  formatTime: function(seconds) {
    if (!seconds || isNaN(seconds)) {
      return '00:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  // 播放/暂停音频
  toggleAudio: async function() {
    const { selectedCity } = this.data;
    if (!selectedCity || !selectedCity.audioUrl) {
      wx.showToast({
        title: '暂无音频',
        icon: 'none'
      });
      return;
    }

    if (!this.data.audioContext) {
      await this.initAudioContext();
    }

    if (this.data.isPlaying) {
      this.data.audioContext.pause();
      this.setData({ isPlaying: false });
    } else {
      this.data.audioContext.play();
      this.setData({ 
        isPlaying: true,
        showAudioPlayer: true
      });
    }
  },

  // 隐藏音频播放器
  hideAudioPlayer: function() {
    if (this.audioContext) {
      this.audioContext.stop();
    }
    this.setData({
      isPlaying: false,
      showAudioPlayer: false,
      showSpeedSelector: false
    });
  },

  // 切换速度选择器显示
  toggleSpeedSelector: function() {
    this.setData({
      showSpeedSelector: !this.data.showSpeedSelector
    });
  },

  // 选择播放速度
  selectPlaybackRate: function(e) {
    const rate = parseFloat(e.currentTarget.dataset.rate);
    this.setData({
      audioPlaybackRate: rate,
      showSpeedSelector: false
    });
    
    // 如果音频正在播放，更新播放速度
    if (this.data.audioContext) {
      this.data.audioContext.playbackRate = rate;
    }
    
    wx.showToast({
      title: `播放速度: ${rate}x`,
      icon: 'none',
      duration: 1000
    });
  },

  // 在页面隐藏时停止音频
  onHide: function() {
    if (this.audioContext) {
      this.audioContext.stop();
      this.setData({ 
        isPlaying: false,
        showAudioPlayer: false
      });
    }
    // 停止背景音乐
    if (this.data.bgMusicContext) {
      this.data.bgMusicContext.stop();
      this.setData({
        isBgMusicPlaying: false
      });
    }
  },

  // 在页面卸载时销毁音频
  onUnload: function() {
    if (this.audioContext) {
      this.audioContext.destroy();
      this.audioContext = null;
    }
    // 销毁背景音乐
    if (this.data.bgMusicContext) {
      this.data.bgMusicContext.destroy();
      this.setData({
        bgMusicContext: null,
        isBgMusicPlaying: false
      });
    }
  },

  // 音频进度控制
  onAudioSliderChange: function(e) {
    const { audioContext } = this.data;
    if (!audioContext) return;
    
    const position = e.detail.value;
    audioContext.seek(position);
  },

  /**
   * 获取月份轮播图数据
   */
  fetchMonthlyCarousel: async function() {
    try {
      // 通过云函数获取轮播图数据 - 使用跨环境调用
      // 创建跨环境调用的Cloud实例
      var c = new wx.cloud.Cloud({ 
        // 必填，表示是未登录模式 
        identityless: true, 
        // 资源方 AppID 
        resourceAppid: 'wx85d92d28575a70f4', 
        // 资源方环境 ID 
        resourceEnv: 'cloud1-1gsyt78b92c539ef', 
      }); 
      await c.init();
      const { result } = await c.callFunction({
        name: 'roaming',
        data: {
          action: 'getMonthlyCarousel'
        }
      });
      
      console.log('获取月份轮播图数据:', result);
      
      if (result.success && result.data && result.data.length > 0) {
        // 处理所有图片的临时链接
        const scenicImages = await Promise.all(result.data.map(async item => {
          let imgUrl = item.imageUrl;
          
          // 检查是否是云存储的文件ID
          if (imgUrl && imgUrl.startsWith('cloud://')) {
            try {
              // 创建跨环境调用的Cloud实例
              var c2 = new wx.cloud.Cloud({ 
                // 必填，表示是未登录模式 
                identityless: true, 
                // 资源方 AppID 
                resourceAppid: 'wx85d92d28575a70f4', 
                // 资源方环境 ID 
                resourceEnv: 'cloud1-1gsyt78b92c539ef', 
              }) 
              await c2.init();
              const tempFileRes = await c2.getTempFileURL({
                fileList: [imgUrl]
              });
              
              if (tempFileRes.fileList && tempFileRes.fileList[0].tempFileURL) {
                imgUrl = tempFileRes.fileList[0].tempFileURL;
              } else {
                console.error('获取临时链接失败:', tempFileRes);
                // 使用默认图片
                imgUrl = 'https://via.placeholder.com/800x600.png?text=' + item.month + '月';
              }
            } catch (err) {
              console.error('获取图片临时链接失败:', err);
              // 使用默认图片
              imgUrl = 'https://via.placeholder.com/800x600.png?text=' + item.month + '月';
            }
          } else if (!imgUrl || !imgUrl.startsWith('http')) {
            // 如果图片URL无效，使用默认图片
            imgUrl = 'https://via.placeholder.com/800x600.png?text=' + item.month + '月';
          }
          
          return {
            imgUrl: imgUrl,
            caption: item.caption || `${item.month}月·风景`
          };
        }));

        
        // 如果没有获取到任何有效的图片，使用模拟数据
        if (scenicImages.length === 0) {
          console.log('没有有效的轮播图数据，使用模拟数据');
          this.setData({
            scenicImages: this.getMockScenicImages(),
            isLoading: false
          });
          return;
        }
        
        // 更新数据
        this.setData({ 
          scenicImages,
          isLoading: false
        });
      } else {
        console.log('月份轮播图数据为空，使用模拟数据');
        this.setData({
          scenicImages: this.getMockScenicImages(),
          isLoading: false
        });
      }
    } catch (err) {
      console.error('获取月份轮播图失败:', err);
      // 发生错误时使用模拟数据
      this.setData({
        scenicImages: this.getMockScenicImages(),
        isLoading: false
      });
    }
  },

  // 处理轮播图切换
  onSwiperChange(e) {
    this.setData({
      currentSwiperIndex: e.detail.current
    });
  },
});
