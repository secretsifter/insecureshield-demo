'use strict';

const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// In-memory data store — synthetic customer, policy, and claim records
// All PII is entirely fictional. Customer base is grown to 5000 records so
// IDOR/BOLA enumeration demonstrates realistic mass-takeover scope.
// ─────────────────────────────────────────────────────────────────────────────

const customers = [
    { id: 'CUST-001', name: 'James Mitchell',   email: 'james.mitchell@gmail.com',    password: 'Pass@1234',     dob: '1978-03-15', phone: '312-555-0101', ssn: 'XXX-XX-4521', address: '142 Oak Street, Chicago, IL 60601',         memberSince: '2018-06-10' },
    { id: 'CUST-002', name: 'Sarah Thompson',   email: 'sarah.thompson@outlook.com',  password: 'Sarah#2024',    dob: '1985-07-22', phone: '415-555-0202', ssn: 'XXX-XX-8832', address: '78 Maple Ave, San Francisco, CA 94103',     memberSince: '2019-01-15' },
    { id: 'CUST-003', name: 'Robert Chen',      email: 'robert.chen@yahoo.com',       password: 'Chen$Secure1',  dob: '1972-11-30', phone: '212-555-0303', ssn: 'XXX-XX-1147', address: '305 Park Blvd, New York, NY 10001',         memberSince: '2017-09-20' },
    { id: 'CUST-004', name: 'Emily Davis',      email: 'emily.davis@gmail.com',       password: 'Emily!9900',    dob: '1990-02-14', phone: '713-555-0404', ssn: 'XXX-XX-3398', address: '901 River Rd, Houston, TX 77001',           memberSince: '2020-03-05' },
    { id: 'CUST-005', name: 'Michael Johnson',  email: 'mjohnson@hotmail.com',        password: 'MJohn#456',     dob: '1968-08-19', phone: '602-555-0505', ssn: 'XXX-XX-7764', address: '54 Desert View Dr, Phoenix, AZ 85001',      memberSince: '2016-11-30' },
    { id: 'CUST-006', name: 'Linda Martinez',   email: 'linda.martinez@gmail.com',    password: 'Linda@789',     dob: '1982-05-03', phone: '214-555-0606', ssn: 'XXX-XX-2215', address: '222 Lone Star Blvd, Dallas, TX 75201',      memberSince: '2021-07-12' },
    { id: 'CUST-007', name: 'David Wilson',     email: 'dwilson@yahoo.com',           password: 'DWilson$2024',  dob: '1975-12-08', phone: '206-555-0707', ssn: 'XXX-XX-9940', address: '1200 Pike Place, Seattle, WA 98101',        memberSince: '2019-04-18' },
    { id: 'CUST-008', name: 'Jennifer Lee',     email: 'jen.lee@outlook.com',         password: 'JLee!2023',     dob: '1993-06-25', phone: '404-555-0808', ssn: 'XXX-XX-5573', address: '88 Peach Tree St, Atlanta, GA 30301',       memberSince: '2022-01-09' },
    { id: 'CUST-009', name: 'Christopher Brown',email: 'cbrown@gmail.com',            password: 'CBrown#88',     dob: '1980-09-17', phone: '617-555-0909', ssn: 'XXX-XX-6628', address: '45 Beacon Hill, Boston, MA 02101',          memberSince: '2018-08-22' },
    { id: 'CUST-010', name: 'Amanda Garcia',    email: 'amanda.garcia@gmail.com',     password: 'Amanda@512',    dob: '1987-01-11', phone: '305-555-1010', ssn: 'XXX-XX-3341', address: '700 Biscayne Blvd, Miami, FL 33101',        memberSince: '2020-10-15' },
    { id: 'CUST-011', name: 'Kevin Anderson',   email: 'kevin.anderson@hotmail.com',  password: 'KAnderson$1',   dob: '1970-04-28', phone: '503-555-1111', ssn: 'XXX-XX-8856', address: '300 Morrison Bridge, Portland, OR 97201',   memberSince: '2015-05-03' },
    { id: 'CUST-012', name: 'Michelle Taylor',  email: 'mtaylor@yahoo.com',           password: 'MTaylor!007',   dob: '1996-10-05', phone: '720-555-1212', ssn: 'XXX-XX-4419', address: '1600 16th St, Denver, CO 80202',            memberSince: '2023-02-14' },
    { id: 'CUST-013', name: 'Brian Thomas',     email: 'brian.thomas@gmail.com',      password: 'BThomas#22',    dob: '1965-07-14', phone: '612-555-1313', ssn: 'XXX-XX-7702', address: '501 Nicollet Mall, Minneapolis, MN 55401',  memberSince: '2014-12-01' },
    { id: 'CUST-014', name: 'Karen Jackson',    email: 'karen.jackson@outlook.com',   password: 'KJackson$44',   dob: '1983-03-21', phone: '615-555-1414', ssn: 'XXX-XX-1134', address: '400 Broadway, Nashville, TN 37201',         memberSince: '2019-06-30' },
    { id: 'CUST-015', name: 'Steven White',     email: 'steven.white@gmail.com',      password: 'SWhite!1988',   dob: '1988-11-09', phone: '702-555-1515', ssn: 'XXX-XX-9987', address: '3500 Las Vegas Blvd, Las Vegas, NV 89109',  memberSince: '2021-03-17' },
    { id: 'CUST-016', name: 'Nancy Harris',     email: 'nharris@hotmail.com',         password: 'NHarris@66',    dob: '1977-08-30', phone: '314-555-1616', ssn: 'XXX-XX-2263', address: '200 Market St, St. Louis, MO 63101',        memberSince: '2017-07-25' },
    { id: 'CUST-017', name: 'Mark Robinson',    email: 'mark.robinson@yahoo.com',     password: 'MRobin$2025',   dob: '1991-02-18', phone: '216-555-1717', ssn: 'XXX-XX-5576', address: '100 Public Square, Cleveland, OH 44101',    memberSince: '2022-09-08' },
    { id: 'CUST-018', name: 'Patricia Clark',   email: 'pclark@gmail.com',            password: 'PClark#1977',   dob: '1977-06-07', phone: '504-555-1818', ssn: 'XXX-XX-8809', address: '600 Canal St, New Orleans, LA 70130',       memberSince: '2018-11-19' },
    { id: 'CUST-019', name: 'Daniel Lewis',     email: 'daniel.lewis@outlook.com',    password: 'DLewis!333',    dob: '1984-09-26', phone: '443-555-1919', ssn: 'XXX-XX-3322', address: '101 E Pratt St, Baltimore, MD 21202',       memberSince: '2020-04-11' },
    { id: 'CUST-020', name: 'Sandra Walker',    email: 'sandra.walker@gmail.com',     password: 'SWalker$99',    dob: '1969-12-03', phone: '412-555-2020', ssn: 'XXX-XX-6645', address: '500 Grant St, Pittsburgh, PA 15219',        memberSince: '2016-08-14' },
    { id: 'CUST-021', name: 'Paul Allen',       email: 'paul.allen@yahoo.com',        password: 'PAllen@2024',   dob: '1994-04-15', phone: '901-555-2121', ssn: 'XXX-XX-1158', address: '149 Union Ave, Memphis, TN 38103',          memberSince: '2023-05-20' },
    { id: 'CUST-022', name: 'Barbara Young',    email: 'byoung@hotmail.com',          password: 'BYoung#1990',   dob: '1990-07-22', phone: '502-555-2222', ssn: 'XXX-XX-4491', address: '500 W Main St, Louisville, KY 40202',       memberSince: '2021-10-03' },
    { id: 'CUST-023', name: 'Jason Hall',       email: 'jason.hall@gmail.com',        password: 'JHall$2023',    dob: '1986-01-08', phone: '317-555-2323', ssn: 'XXX-XX-7724', address: '200 S Meridian St, Indianapolis, IN 46225', memberSince: '2019-12-16' },
    { id: 'CUST-024', name: 'Donna King',       email: 'donna.king@outlook.com',      password: 'DKing!888',     dob: '1973-10-19', phone: '804-555-2424', ssn: 'XXX-XX-2237', address: '1001 E Main St, Richmond, VA 23219',        memberSince: '2017-02-28' },
    { id: 'CUST-025', name: 'Charles Wright',   email: 'charles.wright@gmail.com',    password: 'CWright@55',    dob: '1979-05-14', phone: '602-555-2525', ssn: 'XXX-XX-5560', address: '777 N Central Ave, Phoenix, AZ 85004',      memberSince: '2020-07-07' }
];

// Forgotten QA test account — left in seeded data after a release cycle.
// The frontend bundle (app.js) still references this email in a leftover comment.
customers.push({
    id: 'CUST-9999', name: 'QA Test Account', email: 'qa.test@acme-portal.local',
    password: 'TestPass!2023', dob: '1990-01-01', phone: '555-555-0000',
    ssn: 'XXX-XX-0000', address: '1 Test Lane, QA City, CA 00000',
    memberSince: '2023-01-01', role: 'admin'
});

// Pad the customer base out to 5000 records so the enumeration scope is realistic.
// Synthetic generator — deterministic, fully fictional.
const _firstNames = ['Alex','Jordan','Taylor','Morgan','Riley','Casey','Jamie','Avery','Quinn','Reese','Dakota','Skylar','Logan','Cameron','Drew','Hayden','Parker','Rowan','Sage','Bailey'];
const _lastNames  = ['Adams','Baker','Carter','Diaz','Evans','Foster','Gomez','Hill','Iverson','Jenkins','Knight','Lopez','Murphy','Nguyen','Owens','Patel','Quinn','Reyes','Sanders','Torres'];
const _streetSfx  = ['St','Ave','Blvd','Rd','Ln','Ct','Pl','Dr','Way','Ter'];
const _cities     = [['Austin','TX','78701'],['Madison','WI','53701'],['Boise','ID','83701'],['Reno','NV','89501'],['Tulsa','OK','74101'],['Akron','OH','44301'],['Mesa','AZ','85201'],['Tampa','FL','33601'],['Omaha','NE','68101'],['Buffalo','NY','14201']];

for (let i = 26; i <= 4998; i++) {
    const fn   = _firstNames[i % _firstNames.length];
    const ln   = _lastNames[(i * 7) % _lastNames.length];
    const city = _cities[i % _cities.length];
    const sfx  = _streetSfx[i % _streetSfx.length];
    customers.push({
        id:          `CUST-${String(i).padStart(3, '0')}`,
        name:        `${fn} ${ln}`,
        email:       `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
        password:    `P@ss!${i}`,
        dob:         `19${70 + (i % 30)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        phone:       `555-${String(100 + (i % 900)).padStart(3, '0')}-${String(i).padStart(4, '0').slice(-4)}`,
        ssn:         `XXX-XX-${String(i).padStart(4, '0')}`,
        address:     `${i} ${ln} ${sfx}, ${city[0]}, ${city[1]} ${city[2]}`,
        memberSince: `20${15 + (i % 9)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`
    });
}

// Attach a synthetic password hash + salt to every record. Deterministic so demo
// runs are reproducible. Format mirrors what a Burp response would show.
customers.forEach(c => {
    const salt = crypto.createHash('md5').update(c.id + ':salt').digest('hex').slice(0, 16);
    const hash = crypto.createHash('sha256').update(c.password + salt).digest('hex').toUpperCase();
    c.salt = salt;
    c.passwordHash = hash;
});

const policies = [
    { policyId: 'POL-10001', customerId: 'CUST-001', type: 'Auto',   premium: 1200, startDate: '2024-01-01', endDate: '2025-01-01', status: 'Active',   coverage: '$100,000',  vehicle: '2020 Toyota Camry'         },
    { policyId: 'POL-10002', customerId: 'CUST-001', type: 'Home',   premium: 1800, startDate: '2024-03-01', endDate: '2025-03-01', status: 'Active',   coverage: '$500,000',  property: '142 Oak Street'           },
    { policyId: 'POL-10003', customerId: 'CUST-002', type: 'Life',   premium: 950,  startDate: '2023-06-01', endDate: '2033-06-01', status: 'Active',   coverage: '$1,000,000',beneficiary: 'Tom Thompson'         },
    { policyId: 'POL-10004', customerId: 'CUST-003', type: 'Auto',   premium: 1350, startDate: '2024-02-01', endDate: '2025-02-01', status: 'Active',   coverage: '$150,000',  vehicle: '2022 Honda Accord'         },
    { policyId: 'POL-10005', customerId: 'CUST-004', type: 'Health', premium: 4200, startDate: '2024-01-01', endDate: '2025-01-01', status: 'Active',   coverage: '$2,000,000',plan: 'Premium PPO'                 },
    { policyId: 'POL-10006', customerId: 'CUST-005', type: 'Home',   premium: 2100, startDate: '2023-11-01', endDate: '2024-11-01', status: 'Expired',  coverage: '$650,000',  property: '54 Desert View Dr'        },
    { policyId: 'POL-10007', customerId: 'CUST-006', type: 'Auto',   premium: 980,  startDate: '2024-04-01', endDate: '2025-04-01', status: 'Active',   coverage: '$75,000',   vehicle: '2019 Ford Escape'          },
    { policyId: 'POL-10008', customerId: 'CUST-007', type: 'Life',   premium: 1100, startDate: '2022-01-01', endDate: '2032-01-01', status: 'Active',   coverage: '$750,000',  beneficiary: 'Mary Wilson'           },
    { policyId: 'POL-10009', customerId: 'CUST-008', type: 'Health', premium: 3600, startDate: '2024-01-01', endDate: '2025-01-01', status: 'Active',   coverage: '$1,500,000',plan: 'Standard HMO'                 },
    { policyId: 'POL-10010', customerId: 'CUST-009', type: 'Auto',   premium: 1450, startDate: '2024-05-01', endDate: '2025-05-01', status: 'Active',   coverage: '$200,000',  vehicle: '2023 BMW 3-Series'         },
    { policyId: 'POL-10011', customerId: 'CUST-010', type: 'Home',   premium: 1650, startDate: '2024-02-01', endDate: '2025-02-01', status: 'Active',   coverage: '$450,000',  property: '700 Biscayne Blvd'        },
    { policyId: 'POL-10012', customerId: 'CUST-011', type: 'Auto',   premium: 1050, startDate: '2023-08-01', endDate: '2024-08-01', status: 'Expired',  coverage: '$100,000',  vehicle: '2018 Chevrolet Silverado'  },
    { policyId: 'POL-10013', customerId: 'CUST-012', type: 'Life',   premium: 720,  startDate: '2023-10-01', endDate: '2033-10-01', status: 'Active',   coverage: '$500,000',  beneficiary: 'Alex Taylor'           },
    { policyId: 'POL-10014', customerId: 'CUST-013', type: 'Health', premium: 5100, startDate: '2024-01-01', endDate: '2025-01-01', status: 'Active',   coverage: '$3,000,000',plan: 'Executive PPO'                },
    { policyId: 'POL-10015', customerId: 'CUST-014', type: 'Auto',   premium: 1250, startDate: '2024-06-01', endDate: '2025-06-01', status: 'Active',   coverage: '$125,000',  vehicle: '2021 Nissan Altima'        },
    { policyId: 'POL-10016', customerId: 'CUST-015', type: 'Home',   premium: 2400, startDate: '2024-01-01', endDate: '2025-01-01', status: 'Active',   coverage: '$800,000',  property: '3500 Las Vegas Blvd'      },
    { policyId: 'POL-10017', customerId: 'CUST-016', type: 'Auto',   premium: 890,  startDate: '2024-03-01', endDate: '2025-03-01', status: 'Active',   coverage: '$80,000',   vehicle: '2017 Jeep Cherokee'        },
    { policyId: 'POL-10018', customerId: 'CUST-017', type: 'Life',   premium: 850,  startDate: '2024-07-01', endDate: '2034-07-01', status: 'Active',   coverage: '$600,000',  beneficiary: 'Lisa Robinson'         },
    { policyId: 'POL-10019', customerId: 'CUST-018', type: 'Health', premium: 3900, startDate: '2024-01-01', endDate: '2025-01-01', status: 'Active',   coverage: '$2,500,000',plan: 'Premium HMO'                 },
    { policyId: 'POL-10020', customerId: 'CUST-019', type: 'Auto',   premium: 1150, startDate: '2024-08-01', endDate: '2025-08-01', status: 'Active',   coverage: '$110,000',  vehicle: '2022 Hyundai Sonata'       },
    { policyId: 'POL-10021', customerId: 'CUST-020', type: 'Home',   premium: 1950, startDate: '2024-04-01', endDate: '2025-04-01', status: 'Active',   coverage: '$550,000',  property: '500 Grant St'             },
    { policyId: 'POL-10022', customerId: 'CUST-021', type: 'Auto',   premium: 1080, startDate: '2024-09-01', endDate: '2025-09-01', status: 'Active',   coverage: '$90,000',   vehicle: '2023 Kia Forte'            },
    { policyId: 'POL-10023', customerId: 'CUST-022', type: 'Health', premium: 4500, startDate: '2024-01-01', endDate: '2025-01-01', status: 'Active',   coverage: '$2,000,000',plan: 'Standard PPO'                 },
    { policyId: 'POL-10024', customerId: 'CUST-023', type: 'Auto',   premium: 1320, startDate: '2024-10-01', endDate: '2025-10-01', status: 'Active',   coverage: '$130,000',  vehicle: '2021 Subaru Outback'       },
    { policyId: 'POL-10025', customerId: 'CUST-024', type: 'Life',   premium: 1250, startDate: '2023-03-01', endDate: '2033-03-01', status: 'Active',   coverage: '$900,000',  beneficiary: 'Robert King'           },
    { policyId: 'POL-10026', customerId: 'CUST-025', type: 'Home',   premium: 2200, startDate: '2024-11-01', endDate: '2025-11-01', status: 'Active',   coverage: '$700,000',  property: '777 N Central Ave'        }
];

const claims = [
    { claimId: 'CLAIM-5001', policyId: 'POL-10001', customerId: 'CUST-001', type: 'Collision',       dateSubmitted: '2024-08-12', amount: 8500,  status: 'Approved',  description: 'Front-end collision on I-90. Damage to bumper and hood.' },
    { claimId: 'CLAIM-5002', policyId: 'POL-10002', customerId: 'CUST-001', type: 'Water Damage',    dateSubmitted: '2024-09-03', amount: 12300, status: 'Open',      description: 'Basement flooding due to burst pipe.' },
    { claimId: 'CLAIM-5003', policyId: 'POL-10003', customerId: 'CUST-002', type: 'Critical Illness',dateSubmitted: '2024-05-20', amount: 50000, status: 'Under Review',description: 'Stage 2 cancer diagnosis. Claim under medical review.' },
    { claimId: 'CLAIM-5004', policyId: 'POL-10004', customerId: 'CUST-003', type: 'Theft',           dateSubmitted: '2024-07-15', amount: 22000, status: 'Approved',  description: 'Vehicle stolen from parking garage overnight.' },
    { claimId: 'CLAIM-5005', policyId: 'POL-10005', customerId: 'CUST-004', type: 'Surgery',         dateSubmitted: '2024-06-10', amount: 38500, status: 'Paid',      description: 'Appendectomy at Houston Methodist Hospital.' },
    { claimId: 'CLAIM-5006', policyId: 'POL-10007', customerId: 'CUST-006', type: 'Windshield',      dateSubmitted: '2024-10-05', amount: 650,   status: 'Paid',      description: 'Windshield crack from road debris on I-35.' },
    { claimId: 'CLAIM-5007', policyId: 'POL-10009', customerId: 'CUST-008', type: 'Emergency Room',  dateSubmitted: '2024-11-18', amount: 6200,  status: 'Open',      description: 'ER visit for severe allergic reaction.' },
    { claimId: 'CLAIM-5008', policyId: 'POL-10010', customerId: 'CUST-009', type: 'Rear-End',        dateSubmitted: '2024-09-25', amount: 14800, status: 'Approved',  description: 'Rear-ended at red light on Commonwealth Ave.' },
    { claimId: 'CLAIM-5009', policyId: 'POL-10011', customerId: 'CUST-010', type: 'Hurricane',       dateSubmitted: '2024-10-12', amount: 45000, status: 'Under Review',description: 'Roof and structural damage from Hurricane Milton.' },
    { claimId: 'CLAIM-5010', policyId: 'POL-10014', customerId: 'CUST-013', type: 'Hospitalization', dateSubmitted: '2024-08-30', amount: 72000, status: 'Paid',      description: 'Cardiac bypass surgery. 5-day ICU stay.' },
    { claimId: 'CLAIM-5011', policyId: 'POL-10015', customerId: 'CUST-014', type: 'Hail Damage',     dateSubmitted: '2024-07-04', amount: 4300,  status: 'Approved',  description: 'Hail storm caused dents on roof and hood.' },
    { claimId: 'CLAIM-5012', policyId: 'POL-10016', customerId: 'CUST-015', type: 'Fire',            dateSubmitted: '2024-12-01', amount: 95000, status: 'Open',      description: 'Kitchen fire spread to living area. Extensive smoke damage.' },
    { claimId: 'CLAIM-5013', policyId: 'POL-10019', customerId: 'CUST-018', type: 'Specialist',      dateSubmitted: '2024-09-14', amount: 8900,  status: 'Paid',      description: 'Orthopedic consultation and MRI for knee injury.' },
    { claimId: 'CLAIM-5014', policyId: 'POL-10020', customerId: 'CUST-019', type: 'Hit and Run',     dateSubmitted: '2024-11-22', amount: 11200, status: 'Under Review',description: 'Parked vehicle hit by unidentified driver in shopping center.' },
    { claimId: 'CLAIM-5015', policyId: 'POL-10021', customerId: 'CUST-020', type: 'Theft',           dateSubmitted: '2024-10-30', amount: 28000, status: 'Approved',  description: 'Jewelry and electronics stolen during residential break-in.' }
];

module.exports = { customers, policies, claims };
