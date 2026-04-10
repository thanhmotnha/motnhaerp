/**
 * Seed Ván Melamin Thái Lan products from truongsonmelamine.com
 * - Download + resize images → /public/uploads/products/
 * - Create ProductCategory "Ván Thái" if not exists
 * - Create 1 Product per màu
 *
 * Run: node scripts/seed-van-thai.mjs
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const DEST_DIR = join(process.cwd(), 'public', 'uploads', 'products');
const WIDTH = 800;
const QUALITY = 82;
const CATEGORY_NAME = 'Ván Thái';
const BRAND = 'Melamine Thái Lan';

const prisma = new PrismaClient();

// ──────────────── DANH SÁCH SẢN PHẨM ────────────────
const PRODUCTS = [
  { code: '031', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/031-new.jpg' },
  { code: '37', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/A37.jpg' },
  { code: '057', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/057.jpg' },
  { code: '203', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/203.jpg' },
  { code: '206', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/206.jpg' },
  { code: '313', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/313.jpg' },
  { code: '323', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-323-T.jpg' },
  { code: '324', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/324.jpg' },
  { code: '325', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/325-1.jpg' },
  { code: '328', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/328.jpg' },
  { code: '329', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/329.jpg' },
  { code: '330', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/330.jpg' },
  { code: '331', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/08/331new1.jpg' },
  { code: '332', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-332-RM.jpg' },
  { code: '333', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/333.jpg' },
  { code: '334', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-334-NV.jpg' },
  { code: '335', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/335.jpg' },
  { code: '336', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MFC-MS-336-WG.jpg' },
  { code: '338', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/338new-e1691120616640.jpg' },
  { code: '340', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-340.jpg' },
  { code: '347', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/347.jpg' },
  { code: '359', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/359.jpg' },
  { code: '379', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/379new-e1691120676904.jpg' },
  { code: '383', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/383.jpg' },
  { code: '384', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/384-1.jpg' },
  { code: '386', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/386-1.jpg' },
  { code: '388', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/388.jpg' },
  { code: '389', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/389new-e1691120711222.jpg' },
  { code: '390', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/390.jpg' },
  { code: '401', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-401-PL.jpg' },
  { code: '402', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/402.jpg' },
  { code: '403', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/403new-e1691120731321.jpg' },
  { code: '404', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/404new-e1691120750555.jpg' },
  { code: '405', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/405.jpg' },
  { code: '406', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/406.jpg' },
  { code: '407', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/407new-e1691120770308.jpg' },
  { code: '408', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/408new-e1691120797397.jpg' },
  { code: '409', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-409-MM.jpg' },
  { code: '410', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/410.jpg' },
  { code: '411', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/411new-e1691120818115.jpg' },
  { code: '412', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/412.jpg' },
  { code: '413', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/413.jpg' },
  { code: '414', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/414.jpg' },
  { code: '415', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-415-EV.jpg' },
  { code: '416', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/416.jpg' },
  { code: '417', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-417-EV.jpg' },
  { code: '418', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-418-EV.jpg' },
  { code: '419', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/419.jpg' },
  { code: '420', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-420-RM.jpg' },
  { code: '421', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/421.jpg' },
  { code: '422', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/422new-e1691120839806.jpg' },
  { code: '423', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/423new-e1691120859871.jpg' },
  { code: '424', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/424new-e1691120878146.jpg' },
  { code: '425', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-425-RL.jpg' },
  { code: '426', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/426.jpg' },
  { code: '427', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-427-RL.jpg' },
  { code: '428', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/428.jpg' },
  { code: '429', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-429-RL.jpg' },
  { code: '430', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-430-BT.jpg' },
  { code: '431', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-431-BT.jpg' },
  { code: '432', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/432.jpg' },
  { code: '433', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/433.jpg' },
  { code: '434', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/434.jpg' },
  { code: '435', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/435.jpg' },
  { code: '436', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/436.jpg' },
  { code: '437', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-437-MM.jpg' },
  { code: '439', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/439.jpg' },
  { code: '440', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/440.jpg' },
  { code: '441', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/441.jpg' },
  { code: '442', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-442-EV.jpg' },
  { code: '443', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-443-EV.jpg' },
  { code: '444', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-444-EV.jpg' },
  { code: '445', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-445-EV.jpg' },
  { code: '446', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/446.jpg' },
  { code: '447', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-447-PL.jpg' },
  { code: '448', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/448.jpg' },
  { code: '449', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-449-EV.jpg' },
  { code: '450', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-450-FR.jpg' },
  { code: '451', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-451-MM.jpg' },
  { code: '452', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-452-MM.jpg' },
  { code: '453', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-453-MM.jpg' },
  { code: '454', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-454-RL.jpg' },
  { code: '455', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-455-EV.jpg' },
  { code: '458', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-458-XM.jpg' },
  { code: '459', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-459-XM.jpg' },
  { code: '460', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-460-XM.jpg' },
  { code: '461', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-461-SC.jpg' },
  { code: '462', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-462-SC.jpg' },
  { code: '463', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-463-SC.jpg' },
  { code: '464', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-464-SC.jpg' },
  { code: '465', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-465-SC.jpg' },
  { code: '466', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-466-SC.jpg' },
  { code: '467', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-467-SC.jpg' },
  { code: '468', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-468-SC.jpg' },
  { code: '469', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-469-SC.jpg' },
  { code: '470', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-470-SC.jpg' },
  { code: '471', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-471-SC.jpg' },
  { code: '472', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-472-SC.jpg' },
  { code: '473', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-473-SC.jpg' },
  { code: '474', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-474-SC.jpg' },
  { code: '475', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-475-EV.jpg' },
  { code: '479', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-479-EV.jpg' },
  { code: '483', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-483-SH.jpg' },
  { code: '484', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-484.jpg' },
  { code: '485', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-485.jpg' },
  { code: '494', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-494.jpg' },
  { code: '495', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-495.jpg' },
  { code: '501', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/501.jpg' },
  { code: '502', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/502.jpg' },
  { code: '503', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/503.jpg' },
  { code: '504', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-504-MM.jpg' },
  { code: '507', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/507.jpg' },
  { code: '508', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/508.jpg' },
  { code: '512', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/512.jpg' },
  { code: '518', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/518.jpg' },
  { code: '520', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/520.jpg' },
  { code: '563', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-536z-e1712719945474.jpg' },
  { code: '607', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/607.jpg' },
  { code: '608', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/608.jpg' },
  { code: '609', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/609.jpg' },
  { code: '610', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-610-RM.jpg' },
  { code: '611', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-611-EV.jpg' },
  { code: '612', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/612.jpg' },
  { code: '613', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/613.jpg' },
  { code: '614', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/08/614.jpg' },
  { code: '622', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/622.jpg' },
  { code: '626', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-626-EV.jpg' },
  { code: '630', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-630-EV.jpg' },
  { code: '631', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-631-EV.jpg' },
  { code: '635', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-635-EV.jpg' },
  { code: '640', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/640-1.jpg' },
  { code: '642', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/642.jpg' },
  { code: '644', img: 'https://truongsonmelamine.com/wp-content/uploads/2019/04/644.jpg' },
  { code: '650', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-650-WN.jpg' },
  { code: '651', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/651.jpg' },
  { code: '717', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/717.jpg' },
  { code: '771', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-771.jpg' },
  { code: '901', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/901.jpg' },
  { code: '901H', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/901H.jpg' },
  { code: '911', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/911.jpg' },
  { code: '996', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/996.jpg' },
  { code: '998', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-998-EL.jpg' },
  { code: '999', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/999.jpg' },
  { code: '1668', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/1668new-e1691120916673.jpg' },
  { code: '2340', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/2340.jpg' },
  { code: '2843', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/2843.jpg' },
  { code: '2862', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/2862.jpg' },
  { code: '3079', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/3079.jpg' },
  { code: '3086', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/3086.jpg' },
  { code: '3096', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/3096.jpg' },
  { code: '3163', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/3163.jpg' },
  { code: '3239', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/3239new-e1691120941667.jpg' },
  { code: '3241', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/3241.jpg' },
  { code: '4002', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-4002-SH.jpg' },
  { code: '4006', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-4006.jpg' },
  { code: '4012', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-4012-EV.jpg' },
  { code: '4013', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-4013.jpg' },
  { code: '4025', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-4025.jpg' },
  { code: '4028', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-4028-NWM.jpg' },
  { code: '4029', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-4029-NWM.jpg' },
  { code: '4030', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-4030-NWM.jpg' },
  { code: '4038', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-4038-NWM.jpg' },
  { code: '5001', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-5001-MM.jpg' },
  { code: '5003', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-5003-MM.jpg' },
  { code: '5004', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-5004-MM.jpg' },
  { code: '5006', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-5006-MM.jpg' },
  { code: '5007', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-5007-MM.jpg' },
  { code: '5008', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-5008-MM.jpg' },
  { code: '5009', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-5009-MM.jpg' },
  { code: '6041', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/6041.jpg' },
  { code: '6161', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/6161.jpg' },
  { code: '7311', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/7311.jpg' },
  { code: '7328', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/7328.jpg' },
  { code: '7392', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/7392.jpg' },
  { code: '9073', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/9073.jpg' },
  { code: '10083', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/10083-1.jpg' },
  { code: '10084', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/10084-1.jpg' },
  { code: '23015', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-23015-T.jpg' },
  { code: 'MS 021', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/021-2.jpg' },
  { code: 'MS 024-LU', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-MS-024-LU.jpg' },
  { code: 'MS 025', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-025-LU.jpg' },
  { code: 'MS 025-MM', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-025-MM.jpg' },
  { code: 'MS 027', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/027-2.jpg' },
  { code: 'MS 030-PL', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-030-PL.jpg' },
  { code: 'MS 032', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/032-2.jpg' },
  { code: 'MS 041', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/041-2.jpg' },
  { code: 'MS 050-T', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-050-T.jpg' },
  { code: 'MS 050-AC', img: 'https://truongsonmelamine.com/wp-content/uploads/2024/04/MS-050z.jpg' },
  { code: 'MS 073-T', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-073-T.jpg' },
  { code: 'MS 074', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/074-2.jpg' },
  { code: 'MS 083', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/083-2.jpg' },
  { code: 'MS 101', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/101-2.jpg' },
  { code: 'MS 103', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/103-2.jpg' },
  { code: 'MS 104', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/104-2.jpg' },
  { code: 'MS 105-G', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-105-G.jpg' },
  { code: 'MS 106-MM', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-106-MM.jpg' },
  { code: 'MS 120-PL', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-120-PL.jpg' },
  { code: 'MS 200-T', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-200-T.jpg' },
  { code: 'MS 201', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/201-2.jpg' },
  { code: 'MS 201-LU', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-201-LU.jpg' },
  { code: 'MS 202', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/202_.jpg' },
  { code: 'MS 204-SH', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-204-SH.jpg' },
  { code: 'MS 205-PL', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/z4498260302880_2e50d025b788fdae23db2d4e6dfb4843.jpg' },
  { code: 'MS 212-ZN', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-212-ZN.jpg' },
  { code: 'MS 213-ZN', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-213-ZN.jpg' },
  { code: 'MS 214-ZN', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-214-ZN.jpg' },
  { code: 'MS 215-LU', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-215-LU.jpg' },
  { code: 'MS 216-LU', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-216-LU.jpg' },
  { code: 'MS 217-LU', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-217-LU.jpg' },
  { code: 'MS 218-ZN', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-218-ZN.jpg' },
  { code: 'MS 219-ZN', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-219-ZN.jpg' },
  { code: 'MS 220-1-MM', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-220-1-MM.jpg' },
  { code: 'MS 221-PL', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-221-PL.jpg' },
  { code: 'MS 222-LU', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/z4498260410994_83de9cf688d8125663415ba2d431d786.jpg' },
  { code: 'MS 230', img: 'https://truongsonmelamine.com/wp-content/uploads/2017/11/230-2.jpg' },
  { code: 'MS 230-LU', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-230-LU.jpg' },
  { code: 'MS 446-FR', img: 'https://truongsonmelamine.com/wp-content/uploads/2023/07/MS-446-FR.jpg' },
];

// ──────────────── HELPERS ────────────────
function toSlug(code) {
    return 'van-thai-' + code.replace(/\s+/g, '-').toLowerCase();
}

async function downloadImage(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' },
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

// ──────────────── MAIN ────────────────
async function main() {
    await mkdir(DEST_DIR, { recursive: true });
    console.log(`\n🇹🇭 Seed Ván Melamin Thái Lan — ${PRODUCTS.length} màu\n`);

    // 1. Tạo / lấy danh mục
    let category = await prisma.productCategory.findFirst({ where: { name: CATEGORY_NAME } });
    if (!category) {
        category = await prisma.productCategory.create({ data: { name: CATEGORY_NAME, slug: 'van-thai', order: 50 } });
        console.log(`✅ Tạo danh mục "${CATEGORY_NAME}" (id: ${category.id})\n`);
    } else {
        console.log(`ℹ️  Danh mục "${CATEGORY_NAME}" đã tồn tại (id: ${category.id})\n`);
    }

    let downloaded = 0, skipped = 0, failed = 0, created = 0, existed = 0;

    for (const p of PRODUCTS) {
        const slug = toSlug(p.code);
        const destFile = `${slug}.jpg`;
        const destPath = join(DEST_DIR, destFile);
        const imageUrl = `/uploads/products/${destFile}`;

        // --- Download & resize ảnh ---
        if (existsSync(destPath)) {
            skipped++;
        } else {
            try {
                const buf = await downloadImage(p.img);
                await sharp(buf)
                    .resize({ width: WIDTH, withoutEnlargement: true })
                    .jpeg({ quality: QUALITY, progressive: true })
                    .toFile(destPath);
                downloaded++;
                process.stdout.write(`  ↓ ${p.code}\n`);
            } catch (e) {
                failed++;
                console.error(`  ✗ ${p.code}: ${e.message}`);
                // Tiếp tục tạo SP dù không có ảnh
            }
        }

        // --- Tạo sản phẩm ---
        const productName = `Ván Melamin Thái Lan (${p.code})`;
        const existing = await prisma.product.findFirst({
            where: { name: productName, deletedAt: null },
        });
        if (existing) {
            existed++;
            continue;
        }

        // generateCode cần import động vì dùng prisma singleton riêng
        const count = await prisma.product.count();
        const spCode = `SP-${String(count + 1).padStart(4, '0')}`;

        await prisma.product.create({
            data: {
                code: spCode,
                name: productName,
                unit: 'tờ',
                category: CATEGORY_NAME,
                categoryId: category.id,
                color: p.code,
                image: existsSync(destPath) ? imageUrl : '',
                brand: BRAND,
                origin: 'Thái Lan',
                status: 'Đang bán',
                supplyType: 'Mua ngoài',
                importPrice: 0,
                salePrice: 0,
                stock: 0,
            },
        });
        created++;
    }

    console.log(`\n────────────────────────────`);
    console.log(`✅ Tải ảnh: ${downloaded} mới, ${skipped} đã có, ${failed} lỗi`);
    console.log(`✅ Sản phẩm tạo mới: ${created}, đã tồn tại: ${existed}`);
    console.log(`────────────────────────────\n`);

    // Hiện 5 mẫu
    const samples = await prisma.product.findMany({
        where: { categoryId: category.id },
        select: { code: true, name: true, color: true, image: true },
        take: 5,
        orderBy: { createdAt: 'asc' },
    });
    console.log('5 sản phẩm đầu tiên:');
    samples.forEach(s => console.log(`  ${s.code} | ${s.name} | màu: ${s.color} | ảnh: ${s.image}`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
