/**
 * Update remaining unmapped MDF AC products by matching base numeric code
 * e.g. 024SMM → base "024" → same group as 024MM (nhóm 3)
 * LUX024AZN → base "024" → nhóm 3
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const PRICES = {
    '17mm': { 1: 685000, 2: 705000, 3: 740000, 4: 765000, 5: 850000, 6: 815000 },
    '6mm': { 1: 295000, 2: 305000, 3: 325000, 4: 340000, 5: 380000, 6: 390000 },
};

// Known base code → group (extracted from full mapping)
const BASE_GROUPS = {
    '01012': 2, '021': 2, '024': 3, '025': 3, '027': 2, '030': 5, '031': 2,
    '032': 2, '041': 2, '050': 2, '072': 2, '073': 2, '074': 2, '083': 2,
    '10081': 4, '10083': 2, '10084': 2, '101': 1, '103': 2, '104': 3,
    '105': 5, '106': 5, '107': 5, '120': 5, '200': 2, '201': 1, '202': 1,
    '203': 2, '204': 5, '205': 5, '206': 5, '212': 3, '213': 3, '214': 3,
    '215': 3, '216': 3, '217': 3, '218': 3, '219': 3, '2165': 2,
    '220': 3, '2201': 3, '221': 5, '222': 3,
    '230': 1, '23015': 3, '23024': 3, '23029': 4, '231': 3, '232': 3,
    '233': 3, '234': 3, '235': 3, '236': 3, '2340': 2, '2342': 2,
    '24003': 3, '24006': 4, '24009': 3,
    '250': 5, '253': 5, '254': 5, '256': 5, '258': 5, '259': 5,
    '262': 5, '263': 5, '274': 5, '275': 5, '276': 3, '277': 3,
    '278': 3, '279': 3, '280': 3, '281': 3,
    '303': 3, '309': 3, '323': 2, '324': 2, '325': 2, '328': 2,
    '329': 2, '330': 4, '331': 2, '332': 3, '333': 3, '334': 4,
    '335': 2, '336': 3, '337': 2, '338': 2, '340': 2, '341': 3,
    '347': 3, '367': 1, '368': 2, '376': 2, '379': 2, '383': 2,
    '384': 2, '385': 1, '386': 2, '388': 2, '389': 3, '390': 3,
    '401': 3, '402': 3, '403': 3, '404': 3, '405': 3, '406': 3,
    '407': 3, '408': 3, '409': 3, '410': 3, '411': 3, '412': 3,
    '413': 3, '414': 3, '415': 3, '416': 3, '417': 3, '418': 3,
    '419': 3, '420': 3, '421': 3, '422': 3, '423': 3, '424': 3,
    '425': 3, '426': 3, '427': 4, '428': 3, '429': 3, '430': 3,
    '431': 3, '432': 6, '433': 3, '434': 3, '435': 3, '436': 3,
    '437': 3, '439': 3, '440': 3, '441': 4, '442': 4, '443': 3,
    '444': 3, '445': 3, '446': 3, '447': 4, '448': 3, '449': 3,
    '450': 3, '4502': 3, '451': 3, '452': 3, '453': 3, '454': 3,
    '455': 4, '456': 1, '457': 1, '458': 4, '459': 4, '460': 4,
    '4601': 2, '4602': 2, '461': 3, '462': 3, '463': 3, '464': 3,
    '465': 3, '466': 3, '467': 3, '468': 3, '469': 4, '470': 4,
    '471': 3, '472': 4, '473': 4, '474': 4, '475': 4, '476': 4,
    '477': 4, '478': 4, '479': 4, '480': 4, '481': 4, '482': 4,
    '483': 3, '484': 3, '485': 4, '486': 4, '487': 4, '488': 4,
    '489': 3, '490': 3, '491': 3, '492': 3, '493': 3, '494': 3,
    '495': 4,
    '5001': 4, '5003': 4, '5004': 4, '5006': 4, '5007': 4, '5008': 4,
    '5009': 4, '5010': 4, '5011': 4, '5012': 3, '5013': 3, '5014': 4,
    '501': 3, '502': 3, '503': 3, '504': 3, '505': 3, '506': 3,
    '507': 3, '508': 3, '509': 3, '511': 3, '512': 3, '513': 3,
    '514': 3, '515': 3, '516': 3, '517': 3, '518': 3, '519': 3,
    '520': 3, '521': 4, '522': 4, '523': 4, '524': 4, '525': 4,
    '526': 4, '527': 4, '528': 4, '529': 4, '530': 4, '531': 4,
    '532': 4, '533': 4, '534': 4,
    '601': 4, '603': 4, '604': 4, '605': 4, '606': 4, '607': 4,
    '608': 4, '609': 4, '610': 4, '611': 4, '612': 4, '613': 4,
    '614': 3, '619': 3, '620': 2, '622': 3, '623': 4, '624': 3,
    '625': 3, '626': 3, '627': 3, '630': 2, '631': 3, '635': 2,
    '640': 2, '641': 2, '642': 2, '643': 2, '644': 2, '650': 2,
    '651': 2, '699': 3,
    '720': 5, '730': 3, '739': 3, '740': 2, '770': 2, '771': 2,
    '790': 3, '851': 3, '852': 3, '865': 2, '869': 1,
    '9205': 2, '9206': 1, '9222': 3, '9223': 3, '9225': 2,
    '9238': 3, '9241': 3, '9284': 2, '9316': 2, '9321': 2, '9322': 2,
    '9323': 1, '9324': 1, '9326': 3, '990': 2, '995': 3, '996': 3,
    '998': 3, '999': 1,
};

// LK + D series defaults
const LK_DEFAULTS = { 'LK048': 1, 'LK1161': 3, 'LK4457': 3, 'LK5909': 1 };

function findGroup(code) {
    // Strip prefixes: LUX, LK, D
    let stripped = code;
    if (code.startsWith('LUX')) {
        stripped = code.replace(/^LUX/, '');
    } else if (code.startsWith('D00')) {
        return 4; // D series default to nhóm 4
    } else if (code.startsWith('LK')) {
        // Check LK known mappings
        for (const [prefix, group] of Object.entries(LK_DEFAULTS)) {
            if (code.startsWith(prefix)) return group;
        }
        return 3; // LK default nhóm 3
    }

    // Extract leading digits
    const match = stripped.match(/^(\d+)/);
    if (!match) return null;
    const numPart = match[1];

    // Try longest match first
    for (let len = numPart.length; len >= 2; len--) {
        const key = numPart.substring(0, len);
        if (BASE_GROUPS[key] !== undefined) return BASE_GROUPS[key];
    }
    return null;
}

async function main() {
    const products = await p.product.findMany({
        where: { category: 'Ván AC', importPrice: 0 },
        include: { attributes: { include: { options: true } } },
    });
    console.log(`${products.length} unmapped products to update`);

    let updated = 0; const stillUnmapped = [];
    for (const prod of products) {
        const group = findGroup(prod.code);
        if (!group) { stillUnmapped.push(prod.code); continue; }

        const price17 = PRICES['17mm'][group];
        const price6 = PRICES['6mm'][group];

        await p.product.update({
            where: { id: prod.id },
            data: { importPrice: price17 },
        });

        for (const attr of prod.attributes) {
            if (attr.name !== 'Độ dày') continue;
            for (const opt of attr.options) {
                if (opt.label === '17mm') {
                    await p.productAttributeOption.update({ where: { id: opt.id }, data: { priceAddon: 0 } });
                } else if (opt.label === '6mm') {
                    await p.productAttributeOption.update({ where: { id: opt.id }, data: { priceAddon: price6 - price17 } });
                }
            }
        }
        updated++;
    }

    console.log(`✅ ${updated} more updated`);
    if (stillUnmapped.length) {
        console.log(`⚠️ Still unmapped (${stillUnmapped.length}): ${stillUnmapped.join(', ')}`);
    }

    // Total stats
    const total = await p.product.count({ where: { category: 'Ván AC', importPrice: { gt: 0 } } });
    const zero = await p.product.count({ where: { category: 'Ván AC', importPrice: 0 } });
    console.log(`\n📊 Total: ${total} with price, ${zero} still ₫0`);
    await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); process.exit(1); });
