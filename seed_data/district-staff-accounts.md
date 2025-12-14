# HP Tourism – Phase II Staff Accounts (DA / DTDO)

Use this manifest to seed the 15 Dealing Assistant (DA) and 15 District Tourism Development Officer (DTDO) accounts that map to the DDO codes in `DDOListforHODCode230-Director-Tourism.pdf`. Passwords follow the convention `da<first3letters>@2025` for DAs and `dtdo<first3letters>@2025` for DTDOs (derived from the district/office label, lower‑case). Mobiles/emails remain deterministic so automated scripts can regenerate them when required.

| # | District / Office | DDO Code | DA Username | DA Password | DA Full Name | DA Mobile | DA Email | DTDO Username | DTDO Password | DTDO Full Name | DTDO Mobile | DTDO Email |
|---|-------------------|----------|-------------|-------------|--------------|-----------|----------|---------------|---------------|----------------|-------------|------------|
| 1 | Chamba HQ | CHM00-532 | `da_chamba` | `dacha@2025` | Anjali Thakur | 7800001001 | da.chamba@himachaltourism.gov.in | `dtdo_chamba` | `dtdocha@2025` | Rakesh Mahajan | 7900001001 | dtdo.chamba@himachaltourism.gov.in |
| 2 | Bharmour Sub-Division | CHM01-001 | `da_bharmour` | `dabha@2025` | Kunal Rana | 7800001002 | da.bharmour@himachaltourism.gov.in | `dtdo_bharmour` | `dtdobha@2025` | Meera Chauhan | 7900001002 | dtdo.bharmour@himachaltourism.gov.in |
| 3 | Shimla HQ (AC Tourism) | CTO00-068 | `da_shimla_hq` | `dashi@2025` | Namita Sood | 7800001003 | da.shimla-hq@himachaltourism.gov.in | `dtdo_shimla_hq` | `dtdoshi@2025` | Lokesh Sharma | 7900001003 | dtdo.shimla-hq@himachaltourism.gov.in |
| 4 | Hamirpur (serving Una) | HMR00-053 | `da_hamirpur` | `daham@2025` | Pooja Verma | 7800001004 | da.hamirpur@himachaltourism.gov.in | `dtdo_hamirpur` | `dtdoham@2025` | Vikas Dogra | 7900001004 | dtdo.hamirpur@himachaltourism.gov.in |
| 5 | Kullu (Bhuntar/Manali) | KLU00-532 | `da_kullu_manali` | `dakul@2025` | Sandeep Negi | 7800001005 | da.kullu-manali@himachaltourism.gov.in | `dtdo_kullu_manali` | `dtdokul@2025` | Ishita Kapoor | 7900001005 | dtdo.kullu-manali@himachaltourism.gov.in |
| 6 | Kullu Dhalpur | KLU00-532 | `da_kullu_dhalpur` | `dakul@2025` | Divya Awasthi | 7800001006 | da.kullu-dhalpur@himachaltourism.gov.in | `dtdo_kullu_dhalpur` | `dtdokul@2025` | Nitin Chaundal | 7900001006 | dtdo.kullu-dhalpur@himachaltourism.gov.in |
| 7 | Dharamsala (Kangra) | KNG00-532 | `da_dharamsala` | `dadha@2025` | Rahul Kashyap | 7800001007 | da.dharamsala@himachaltourism.gov.in | `dtdo_dharamsala` | `dtdodha@2025` | Shreya Mehta | 7900001007 | dtdo.dharamsala@himachaltourism.gov.in |
| 8 | Kinnaur (Reckong Peo) | KNR00-031 | `da_kinnaur` | `dakin@2025` | Tanvi Bisht | 7800001008 | da.kinnaur@himachaltourism.gov.in | `dtdo_kinnaur` | `dtdokin@2025` | Arjun Negi | 7900001008 | dtdo.kinnaur@himachaltourism.gov.in |
| 9 | Kaza (Spiti ITDP) | KZA00-011 | `da_kaza` | `dakaz@2025` | Bharat Rawat | 7800001009 | da.kaza@himachaltourism.gov.in | `dtdo_kaza` | `dtdokaz@2025` | Karuna Lhamu | 7900001009 | dtdo.kaza@himachaltourism.gov.in |
|10 | Lahaul (Keylong) | LHL00-017 | `da_lahaul` | `dalah@2025` | Sneha Dorje | 7800001010 | da.lahaul@himachaltourism.gov.in | `dtdo_lahaul` | `dtdolah@2025` | Mohit Bodh | 7900001010 | dtdo.lahaul@himachaltourism.gov.in |
|11 | Mandi Division | MDI00-532 | `da_mandi` | `daman@2025` | Abhishek Vaidya | 7800001011 | da.mandi@himachaltourism.gov.in | `dtdo_mandi` | `dtdoman@2025` | Ritu Sharma | 7900001011 | dtdo.mandi@himachaltourism.gov.in |
|12 | Pangi (ITDP) | PNG00-003 | `da_pangi` | `dapan@2025` | Jyoti Chauhan | 7800001012 | da.pangi@himachaltourism.gov.in | `dtdo_pangi` | `dtdopan@2025` | Deepak Thakur | 7900001012 | dtdo.pangi@himachaltourism.gov.in |
|13 | Shimla Division | SML00-532 | `da_shimla` | `dashi@2025` | Varun Kapila | 7800001013 | da.shimla@himachaltourism.gov.in | `dtdo_shimla` | `dtdoshi@2025` | Neha Bhandari | 7900001013 | dtdo.shimla@himachaltourism.gov.in |
|14 | Sirmaur (Nahan) | SMR00-055 | `da_sirmaur` | `dasir@2025` | Reena Gusain | 7800001014 | da.sirmaur@himachaltourism.gov.in | `dtdo_sirmaur` | `dtdosir@2025` | Amit Chauhan | 7900001014 | dtdo.sirmaur@himachaltourism.gov.in |
|15 | Solan Division | SOL00-046 | `da_solan` | `dasol@2025` | Karan Pathania | 7800001015 | da.solan@himachaltourism.gov.in | `dtdo_solan` | `dtdosol@2025` | Ishika Verma | 7900001015 | dtdo.solan@himachaltourism.gov.in |

### Seeding Notes
- **Password policy**: Default credentials now follow `daXXX@2025` / `dtdoXXX@2025` (XXX = first three letters from the district label, lower-case). Store bcrypt hashes when seeding and force password reset on handover.
- **Roles**: set DA accounts to `dealing_assistant` and DTDO accounts to `district_tourism_officer`. Tie each user’s `district` column to the normalized district/office label above.
- **Emails & mobiles**: change as needed to match production records; these placeholders are deterministic for easy scripting.
- **DDO mapping**: Each row aligns with the DDO codes in the source PDF, so payment routing and Himkosh mappings can reference the same code when generating DDO-specific configuration.
