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

const ok = (data) => ({ code: 1, message: 'SUCCESS', data });

// Convierte un item del catálogo al formato ShopDecorationInfo que lee la app.
// Se conservan los campos originales y se rellenan los que falten.
function toShop(item, typeId, idx) {
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
    resourceId: String(item.id),
    sex: 0,
    suitId: 0,
    suitPrice: 0,
    tag: [],
    ...item,
    typeId,
  };
}

function shopList(req, res) {
  const typeId = Number(req.params.typeId);
  const src = catalog[typeId] || [];
  console.log('SHOP typeId =', typeId, 'items =', src.length);
  res.status(200).json(ok(src.map((it, i) => toShop(it, typeId, i))));
}

router.get('/api/:version/new/shop/decorations/:typeId', shopList);
router.get('/api/:version/shop/decorations/:typeId', shopList);

module.exports = router;
