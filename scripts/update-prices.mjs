/**
 * Update import prices for MDF AC products based on An Cuong price table
 * Maps product code → nhóm giá → import price for 17mm and 6mm
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Price table: nhóm giá → price (VND) for each thickness
const PRICES = {
    '17mm': { 1: 685000, 2: 705000, 3: 740000, 4: 765000, 5: 850000, 6: 815000 },
    '6mm': { 1: 295000, 2: 305000, 3: 325000, 4: 340000, 5: 380000, 6: 390000 },
};

// Code → nhóm giá (Khổ 4'*8') from An Cuong price table
// Codes with / are expanded: "024MM/LU" → both 024MM and 024LU
const GROUP_MAP = {
    // Nhóm 1
    '101T': 1, '101LU': 1, '201S': 1, '201LU': 1, '202S': 1,
    '230S': 1, '230LU': 1, '367T': 1, '385T': 1, '456RM': 1, '457NV': 1,
    '869SL': 1, '869FR': 1, '9206T': 1, '9323T': 1, '9324T': 1,
    '999FR': 1, '999EL': 1, 'LK048T': 1, 'LK5909WN': 1,

    // Nhóm 2
    '01012T': 2, '021T': 2, '027T': 2, '031WN': 2, '032T': 2, '050T': 2,
    '072SH': 2, '073T': 2, '074T': 2, '083T': 2, '10083T': 2, '10084T': 2,
    '103T': 2, '200NV': 2, '203T': 2, '203LU': 2,
    '2165T': 2, '2340T': 2, '323T': 2, '324T': 2, '325T': 2,
    '328WG': 2, '329EV': 2, '331EV': 2, '335WG': 2,
    '338T': 2, '340T': 2, '379ML': 2, '384T': 2, '386T': 2, '388EV': 2,
    '4601T': 2, '620WN': 2, '630WN': 2, '635WN': 2, '640WN': 2,
    '643WN': 2, '650WN': 2, '770SH': 2, '771EV': 2, '9205S': 2,
    '337RM': 2,

    // Nhóm 3
    '024MM': 3, '024LU': 3, '025MM': 3, '025LU': 3,
    '104T': 3, '104LU': 3, '212ZN': 3, '212LU': 3,
    '213ZN': 3, '214ZN': 3, '215ZN': 3, '215LU': 3,
    '216ZN': 3, '216LU': 3, '217ZN': 3, '217LU': 3,
    '218ZN': 3, '219ZN': 3, '220-1T': 3, '220-1LU': 3,
    '222ZN': 3, '222LU': 3, '23015T': 3, '231LU': 3, '232LU': 3,
    '233LU': 3, '234LU': 3, '235LU': 3, '236LU': 3,
    '24003NV': 3, '276SMM': 3, '277SMM': 3, '278SMM': 3,
    '279SMM': 3, '280SMM': 3, '281SMM': 3,
    '332RM': 3, '333PL': 3, '336WG': 3, '341T': 3, '347PL': 3,
    '389SL': 3, '390EV': 3,
    '401PL': 3, '402PL': 3, '403PL': 3, '404PL': 3, '405PL': 3,
    '406PL': 3, '407PL': 3, '408PL': 3, '409MM': 3,
    '410MM': 3, '411MM': 3, '412MM': 3, '413MM': 3, '414MM': 3,
    '415EV': 3, '416EV': 3, '417EV': 3, '418EV': 3,
    '419RM': 3, '420RM': 3, '421RM': 3, '422RM': 3, '423RM': 3,
    '424RM': 3, '425RL': 3, '426PL': 3, '427RL-T': 3, '429RL': 3,
    '430BT': 3, '431BT': 3, '433SMM': 3, '434SMM': 3, '435SMM': 3,
    '436SMM': 3, '437SMM': 3, '439RL': 3, '440NWG': 3,
    '443RL': 3, '444RL': 3, '445RL': 3, '448NWG-T': 3,
    '449FR': 3, '450FR': 3, '451SMM': 3, '452SMM': 3, '453SMM': 3,
    '454RL': 3, '461SL': 3, '462SL': 3, '463SL': 3, '464SL': 3,
    '465EV': 3, '466EV': 3, '467EV': 3, '468EV': 3,
    '471EV': 3, '483SHG': 3, '484RL': 3,
    '489NWM': 3, '490NWM': 3, '491NWM': 3, '492NWM': 3, '493NWM': 3,
    '494NWG': 3,
    '4028NWM': 3, '4029NWM': 3, '4030NWM': 3, '4038NWM': 3,
    '5012SMM': 3, '5013SMM': 3,
    '501MM': 3, '502MM': 3, '503MM': 3, '504MM': 3,
    '517MM': 3, '518MM': 3, '520MM': 3,
    '614EV': 3, '619EV': 3, '624EV': 3, '625T': 3,
    '626EV': 3, '627EV': 3, '631EV': 3,
    '730SH': 3, '790SH': 3, '851T': 3,
    '9223NV': 3, '9241ML': 3, '9326FR': 3,
    '996FR/EL': 3, '996FR': 3, '996EL': 3,
    '998FR/EL': 3, '998FR': 3, '998EL': 3,
    'LK1161T': 3, 'LK4457T': 3,
    '509MM': 3, '512MM': 3, '513MM': 3, '516MM': 3, '519MM': 3,

    // Nhóm 4
    '10081NV': 4, '23029NV': 4, '24006NV': 4, '330PL': 4, '334NV': 4,
    '4002SHG': 4, '4006RL': 4, '4009RL': 4,
    '4012NWM': 4, '4013RL': 4, '4016RL': 4, '4025RL': 4,
    '427RL': 4, '441RL': 4, '442RL': 4, '447SL': 4, '455NWG': 4,
    '458XM': 4, '459XM': 4, '460XM': 4,
    '469EV': 4, '470EV': 4, '472EV': 4, '473EV': 4, '474EV': 4,
    '475NWM': 4, '476SHG': 4, '477NWM': 4, '478SHG': 4,
    '479NWM': 4, '480SHG': 4, '481NWM': 4, '482NWM': 4,
    '485RL': 4, '486FR': 4, '487NWM': 4, '488NWM': 4,
    '495EL': 4,
    '5001SMM': 4, '5003SMM': 4, '5004SMM': 4,
    '5006SMM': 4, '5007SMM': 4, '5008SMM': 4,
    '5009SMM': 4, '5010SMM': 4, '5011SMM': 4,
    '521NWM': 4, '522NWM': 4, '523NWM': 4, '524NWM': 4,
    '525NWM': 4, '526NWM': 4, '527NWM': 4, '528NWM': 4,
    '529NWM': 4, '530NWM': 4, '531NWM': 4, '532NWM': 4,
    '533NWM': 4, '534NWM': 4,
    '601MM': 4, '604RM': 4, '605RM': 4, '606MM': 4, '607MM': 4,
    '608EV': 4, '609EV': 4, '610RM': 4, '611EV': 4, '612EV': 4,
    '613EV': 4, '623EV': 4,

    // Nhóm 5
    '030SH': 5, '105G': 5, '106SH': 5, '107SH': 5, '120PL': 5,
    '204SH': 5, '205SH': 5, '206SH': 5, '221SH': 5,
    '250SH': 5, '253SH': 5, '254SH': 5, '256SH': 5,
    '258SH': 5, '259SH': 5, '262SH': 5, '263SH': 5,
    '274SH': 5, '275SH': 5,

    // Nhóm 6
    '333SC': 6, '426SC': 6, '432SC': 6,
    '461SC01': 6, '462SC01': 6, '463SC01': 6, '464SC01': 6,
    '465SC04': 6, '466SC04': 6, '467SC04': 6,
    '468SC02': 6, '469SC02': 6, '470SC02': 6,
    '471SC03': 6, '472SC03': 6, '473SC03': 6, '474SC03': 6,
    '487SC05': 6, '488SC05': 6,
    '489SC06': 6, '490SC06': 6,
    '491SC07': 6, '492SC07': 6, '493SC07': 6,
};

async function main() {
    const products = await p.product.findMany({
        where: { category: 'Ván AC' },
        include: {
            attributes: { include: { options: true } },
        },
    });
    console.log(`Found ${products.length} MDF AC products`);

    let updated = 0, notFound = 0;
    const unmapped = [];

    for (const prod of products) {
        const group = GROUP_MAP[prod.code];
        if (!group) {
            unmapped.push(prod.code);
            notFound++;
            continue;
        }

        const price17 = PRICES['17mm'][group];
        const price6 = PRICES['6mm'][group];

        // Update base importPrice = 17mm price
        await p.product.update({
            where: { id: prod.id },
            data: { importPrice: price17 },
        });

        // Update variant priceAddon
        for (const attr of prod.attributes) {
            if (attr.name !== 'Độ dày') continue;
            for (const opt of attr.options) {
                if (opt.label === '17mm') {
                    await p.productAttributeOption.update({
                        where: { id: opt.id },
                        data: { priceAddon: 0 },
                    });
                } else if (opt.label === '6mm') {
                    await p.productAttributeOption.update({
                        where: { id: opt.id },
                        data: { priceAddon: price6 - price17 },
                    });
                }
            }
        }
        updated++;
    }

    console.log(`✅ ${updated} updated, ${notFound} not mapped`);
    if (unmapped.length > 0) {
        console.log(`\n⚠️ Unmapped codes (${unmapped.length}):`);
        unmapped.forEach(c => console.log(`  ${c}`));
    }

    // Show samples
    const samples = await p.product.findMany({
        where: { category: 'Ván AC' },
        include: { attributes: { include: { options: true } } },
        take: 5, orderBy: { code: 'asc' },
    });
    console.log('\nSamples:');
    for (const s of samples) {
        const opts = s.attributes.flatMap(a => a.options.map(o => `${o.label}=${o.priceAddon}`));
        console.log(`  [${s.code}] nhóm ${GROUP_MAP[s.code] || '?'} → importPrice=${s.importPrice} | ${opts.join(', ')}`);
    }
    await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); process.exit(1); });
