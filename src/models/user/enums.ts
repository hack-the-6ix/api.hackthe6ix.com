import schools from './schools';

export const enumOptions = {
  school: schools,
  preEventWorkshops: [
    'Yes',
    'No',
    'Maybe',
  ],
  programOfStudy: [
    'High School',
    'Engineering',
    'Computer Science',
    'Business',
    'Liberal Arts',
    'UX design',
    'Sciences'
  ],
  gender: ['Male', 'Female', 'Non-Binary', 'Other', 'Prefer not to say'],
  pronouns: ['He/Him', 'She/Her', 'They/Them', 'Other', 'Prefer not to say'],
  ethnicity: [
    'Black/People of African Descent',
    'Arab / Middle Eastern',
    'East Asian (e.g. China, Japan, Korea)',
    'Indigenous Person of Canada',
    'Latinx',
    'Southeast Asian (e.g. India, Pakistan, Sri Lanka)',
    'West Asian (e.g. Afghanistan, Iran)',
    'White / People of European Descent',
    'Other',
    'Prefer not to answer',
  ],
  timezone: [
    'MIT - Midway Islands Time (GMT-11:00)',
    'HST - Hawaii Standard Time (GMT-10:00)',
    'AST - Alaska Standard Time (GMT-9:00)',
    'PST - Pacific Standard Time (GMT-8:00)',
    'PNT - Phoenix Standard Time (GMT-7:00)',
    'MST - Mountain Standard Time (GMT-7:00)',
    'CST - Central Standard Time (GMT-6:00)',
    'EST - Eastern Standard Time (GMT-5:00)',
    'IET - Indiana Eastern Standard Time (GMT-5:00)',
    'PRT - Puerto Rico and US Virgin Islands Time (GMT-4:00)',
    'CNT - Canada Newfoundland Time (GMT-3:30)',
    'AGT - Argentina Standard Time (GMT-3:00)',
    'BET - Brazil Eastern Time (GMT-3:00)',
    'CAT - Central African Time (GMT-1:00)',
    'GMT - Greenwich Mean Time (GMT)',
    'UTC - Universal Coordinated Time (GMT)',
    'ECT - European Central Time (GMT+1:00)',
    'EET - Eastern European Time (GMT+2:00)',
    'ART - (Arabic) Egypt Standard Time (GMT+2:00)',
    'EAT - Eastern African Time (GMT+3:00)',
    'MET - Middle East Time (GMT+3:30)',
    'NET - Near East Time (GMT+4:00)',
    'PLT - Pakistan Lahore Time (GMT+5:00)',
    'IST - India Standard Time (GMT+5:30)',
    'BST - Bangladesh Standard Time (GMT+6:00)',
    'VST - Vietnam Standard Time (GMT+7:00)',
    'CTT - China Taiwan Time (GMT+8:00)',
    'JST - Japan Standard Time (GMT+9:00)',
    'ACT - Australia Central Time (GMT+9:30)',
    'AET - Australia Eastern Time (GMT+10:00)',
    'SST - Solomon Standard Time (GMT+11:00)',
    'NST - New Zealand Standard Time (GMT+12:00)',
  ],
  province: [
    'Alberta',
    'British Columbia',
    'Manitoba',
    'New Brunswick',
    'Newfoundland and Labrador',
    'Nova Scotia',
    'Ontario',
    'Prince Edward Island',
    'Quebec',
    'Saskatchewan',
    'Northwest Territories',
    'Nunavut',
    'Yukon',
  ],
  countries: [
    'Afghanistan',
    'Albania',
    'Algeria',
    'American Samoa',
    'Andorra',
    'Angola',
    'Anguilla',
    'Antarctica',
    'Antigua and Barbuda',
    'Argentina',
    'Armenia',
    'Aruba',
    'Australia',
    'Austria',
    'Azerbaijan',
    'Bahamas (the)',
    'Bahrain',
    'Bangladesh',
    'Barbados',
    'Belarus',
    'Belgium',
    'Belize',
    'Benin',
    'Bermuda',
    'Bhutan',
    'Bolivia (Plurinational State of)',
    'Bonaire, Sint Eustatius and Saba',
    'Bosnia and Herzegovina',
    'Botswana',
    'Bouvet Island',
    'Brazil',
    'British Indian Ocean Territory (the)',
    'Brunei Darussalam',
    'Bulgaria',
    'Burkina Faso',
    'Burundi',
    'Cabo Verde',
    'Cambodia',
    'Cameroon',
    'Canada',
    'Cayman Islands (the)',
    'Central African Republic (the)',
    'Chad',
    'Chile',
    'China',
    'Christmas Island',
    'Cocos (Keeling) Islands (the)',
    'Colombia',
    'Comoros (the)',
    'Congo (the Democratic Republic of the)',
    'Congo (the)',
    'Cook Islands (the)',
    'Costa Rica',
    'Croatia',
    'Cuba',
    'Curaçao',
    'Cyprus',
    'Czechia',
    'Côte d\'Ivoire',
    'Denmark',
    'Djibouti',
    'Dominica',
    'Dominican Republic (the)',
    'Ecuador',
    'Egypt',
    'El Salvador',
    'Equatorial Guinea',
    'Eritrea',
    'Estonia',
    'Eswatini',
    'Ethiopia',
    'Falkland Islands (the) [Malvinas]',
    'Faroe Islands (the)',
    'Fiji',
    'Finland',
    'France',
    'French Guiana',
    'French Polynesia',
    'French Southern Territories (the)',
    'Gabon',
    'Gambia (the)',
    'Georgia',
    'Germany',
    'Ghana',
    'Gibraltar',
    'Greece',
    'Greenland',
    'Grenada',
    'Guadeloupe',
    'Guam',
    'Guatemala',
    'Guernsey',
    'Guinea',
    'Guinea-Bissau',
    'Guyana',
    'Haiti',
    'Heard Island and McDonald Islands',
    'Holy See (the)',
    'Honduras',
    'Hong Kong',
    'Hungary',
    'Iceland',
    'India',
    'Indonesia',
    'Iran (Islamic Republic of)',
    'Iraq',
    'Ireland',
    'Isle of Man',
    'Israel',
    'Italy',
    'Jamaica',
    'Japan',
    'Jersey',
    'Jordan',
    'Kazakhstan',
    'Kenya',
    'Kiribati',
    'Korea (the Democratic People\'s Republic of)',
    'Korea (the Republic of)',
    'Kuwait',
    'Kyrgyzstan',
    'Lao People\'s Democratic Republic (the)',
    'Latvia',
    'Lebanon',
    'Lesotho',
    'Liberia',
    'Libya',
    'Liechtenstein',
    'Lithuania',
    'Luxembourg',
    'Macao',
    'Madagascar',
    'Malawi',
    'Malaysia',
    'Maldives',
    'Mali',
    'Malta',
    'Marshall Islands (the)',
    'Martinique',
    'Mauritania',
    'Mauritius',
    'Mayotte',
    'Mexico',
    'Micronesia (Federated States of)',
    'Moldova (the Republic of)',
    'Monaco',
    'Mongolia',
    'Montenegro',
    'Montserrat',
    'Morocco',
    'Mozambique',
    'Myanmar',
    'Namibia',
    'Nauru',
    'Nepal',
    'Netherlands (the)',
    'New Caledonia',
    'New Zealand',
    'Nicaragua',
    'Niger (the)',
    'Nigeria',
    'Niue',
    'Norfolk Island',
    'Northern Mariana Islands (the)',
    'Norway',
    'Oman',
    'Pakistan',
    'Palau',
    'Palestine, State of',
    'Panama',
    'Papua New Guinea',
    'Paraguay',
    'Peru',
    'Philippines (the)',
    'Pitcairn',
    'Poland',
    'Portugal',
    'Puerto Rico',
    'Qatar',
    'Republic of North Macedonia',
    'Romania',
    'Russian Federation (the)',
    'Rwanda',
    'Réunion',
    'Saint Barthélemy',
    'Saint Helena, Ascension and Tristan da Cunha',
    'Saint Kitts and Nevis',
    'Saint Lucia',
    'Saint Martin (French part)',
    'Saint Pierre and Miquelon',
    'Saint Vincent and the Grenadines',
    'Samoa',
    'San Marino',
    'Sao Tome and Principe',
    'Saudi Arabia',
    'Senegal',
    'Serbia',
    'Seychelles',
    'Sierra Leone',
    'Singapore',
    'Sint Maarten (Dutch part)',
    'Slovakia',
    'Slovenia',
    'Solomon Islands',
    'Somalia',
    'South Africa',
    'South Georgia and the South Sandwich Islands',
    'South Sudan',
    'Spain',
    'Sri Lanka',
    'Sudan (the)',
    'Suriname',
    'Svalbard and Jan Mayen',
    'Sweden',
    'Switzerland',
    'Syrian Arab Republic',
    'Taiwan',
    'Tajikistan',
    'Tanzania, United Republic of',
    'Thailand',
    'Timor-Leste',
    'Togo',
    'Tokelau',
    'Tonga',
    'Trinidad and Tobago',
    'Tunisia',
    'Turkey',
    'Turkmenistan',
    'Turks and Caicos Islands (the)',
    'Tuvalu',
    'Uganda',
    'Ukraine',
    'United Arab Emirates (the)',
    'United Kingdom of Great Britain and Northern Ireland (the)',
    'United States Minor Outlying Islands (the)',
    'United States of America (the)',
    'Uruguay',
    'Uzbekistan',
    'Vanuatu',
    'Venezuela (Bolivarian Republic of)',
    'Viet Nam',
    'Virgin Islands (British)',
    'Virgin Islands (U.S.)',
    'Wallis and Futuna',
    'Western Sahara',
    'Yemen',
    'Zambia',
    'Zimbabwe',
    'Åland Islands',
  ],
  yearsOfStudy: [
    'High School',
    'Undergraduate Year 1',
    'Undergraduate Year 2',
    'Undergraduate Year 3',
    'Undergraduate Year 4+',
    'Graduate School',
    'Recent Graduate',
  ],
  hackathonsAttended: [
    'This is my first one',
    '1',
    '2-3',
    '4-5',
    '6+',
  ],
};
