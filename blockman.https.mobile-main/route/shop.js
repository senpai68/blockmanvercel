const express = require('express');
const router = express.Router();

const catalog = {
  1: require('../config/decoration/1'),
  2: require('../config/decoration/2'),
  3: require('../config/decoration/3'),
  4: require('../config/decoration/4'),
  5: require('../config/decoration/5'),
  6: require('../config/decoration/6'),
  7: require('../config/decoration/7'),
};
const all = Object.values(catalog).flat();

const ok = (data) => ({ code: 1, message: 'SUCCESS', data });

// Formato ShopDecorationInfo. Los valores de la prenda mandan sobre los defaults.
function toShop(item, idx) {
  return {
    activityFlag: '',
    buySuccess: false,
    currency: 1,
    details: '',
    expire: 0,
    hasPurchase: 0,
    iconUrl: '',
    isActivity: 0,
    isNew: 0,
    isRecommend: 0,
    limitedTimes: [],
    name: '',
    occupyPosition: [],
    orderField: idx,
    price: 0,
    quantity: 1,
    releaseTime: 0,
    remainingDays: 0,
    sex: 0,
    suitId: 0,
    suitPrice: 0,
    tag: [],
    ...item,
    resourceId: String(item.resourceId != null ? item.resourceId : item.id),
  };
}

function shopList(req, res) {
  const t = Number(req.params.typeId);
  // 1) por typeId real de la prenda; 2) respaldo: número de catálogo
  let src = all.filter((i) => Number(i.typeId) === t);
  if (src.length === 0) src = catalog[t] || [];
  console.log('SHOP typeId =', t, 'items =', src.length);
  res.status(200).json(ok(src.map((it, i) => toShop(it, i))));
}

router.get('/api/:version/new/shop/decorations/:typeId', shopList);
router.get('/api/:version/shop/decorations/:typeId', shopList);

module.exports = router;
