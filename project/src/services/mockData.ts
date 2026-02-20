import { WeatherData, CropAdvice } from '../types';
import { format, addDays } from 'date-fns';

// Comprehensive weather data including historical patterns and forecasts
export const getMockWeatherData = (location: string = 'Gurugram'): WeatherData => {
  const weatherDatabase = {
    'Gurugram': {
      currentConditions: {
        temperature: 28,
        condition: 'Sunny',
        humidity: 65,
        windSpeed: 12,
        rainfall: 0,
        pressure: 1012,
        visibility: 10,
        uvIndex: 6
      },
      forecast: Array.from({ length: 7 }, (_, i) => ({
        date: format(addDays(new Date(), i), 'yyyy-MM-dd'),
        maxTemp: 28 + Math.floor(Math.random() * 5),
        minTemp: 18 + Math.floor(Math.random() * 5),
        condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
        precipitation: Math.floor(Math.random() * 30),
        humidity: 60 + Math.floor(Math.random() * 20)
      })),
      agriculturalMetrics: {
        soilMoisture: '28%',
        soilTemperature: '24°C',
        evapotranspiration: '5.2 mm/day',
        growingDegreeDays: 145
      }
    }
  };

  const defaultLocation = weatherDatabase['Gurugram'];
  const locationData = weatherDatabase[location as keyof typeof weatherDatabase] || defaultLocation;

  return {
    location,
    ...locationData.currentConditions,
    forecast: `7-day Forecast: ${locationData.forecast.map(day => 
      `${format(new Date(day.date), 'MMM d')}: ${day.condition}, ${day.maxTemp}°C/${day.minTemp}°C`
    ).join('. ')}`,
    agriculturalMetrics: locationData.agriculturalMetrics
  };
};

// Enhanced crop database with detailed cultivation information
export const getMockCropAdvice = (cropName: string): CropAdvice => {
  const cropDatabase = {
    wheat: {
      cropName: 'Wheat',
      varieties: [
        { name: 'HD-2967', duration: '140-145 days', yield: '5.0-5.5 tons/ha' },
        { name: 'PBW-343', duration: '135-140 days', yield: '4.5-5.0 tons/ha' }
      ],
      seasonalTips: 'Optimal sowing time: mid-October to mid-November. Row spacing: 20cm. Seed rate: 100-125 kg/ha. Pre-sowing irrigation recommended.',
      pestControl: 'Monitor for aphids, termites, and pink stem borer. Use neem-based solutions (5ml/L) for aphids. For rust diseases, spray propiconazole @ 0.1%.',
      irrigation: 'First irrigation 21 days after sowing. Critical stages: crown root initiation (CRI), tillering, jointing, flowering, and grain filling. Total water requirement: 450-650mm.',
      fertilizer: 'NPK requirement: 120:60:40 kg/ha. Apply N in three splits: basal (1/3), CRI stage (1/3), and tillering stage (1/3). Apply full P and K as basal.',
      soilType: 'Well-drained loam to clay loam soils with pH 6.5-7.5',
      marketInfo: {
        currentPrice: '₹2,015/quintal',
        demand: 'High',
        majorMarkets: ['Karnal', 'Ludhiana', 'Indore']
      }
    },
    rice: {
      cropName: 'Rice',
      varieties: [
        { name: 'MTU-7029', duration: '145-150 days', yield: '6.0-6.5 tons/ha' },
        { name: 'IR-64', duration: '130-135 days', yield: '5.5-6.0 tons/ha' }
      ],
      seasonalTips: 'Transplant 25-30 days old seedlings. Spacing: 20x15cm. Seedling rate: 40-45 kg/ha for nursery.',
      pestControl: 'Monitor for stem borer, leaf folder, and blast disease. Use pheromone traps (5/ha) for stem borer. Spray tricyclazole @ 0.6g/L for blast.',
      irrigation: 'Maintain 5cm standing water during critical stages. Practice alternate wetting and drying to save water.',
      fertilizer: 'NPK requirement: 120:60:40 kg/ha. Apply N in three splits: basal (1/4), tillering (1/2), and panicle initiation (1/4).',
      soilType: 'Clay to clay loam soils with pH 6.5-7.5',
      marketInfo: {
        currentPrice: '₹1,940/quintal',
        demand: 'Medium',
        majorMarkets: ['Karnal', 'Burdwan', 'Raichur']
      }
    }
  };

  const defaultCrop = {
    cropName: cropName,
    varieties: [
      { name: 'Local Variety', duration: '120-150 days', yield: 'Variable' }
    ],
    seasonalTips: 'Ensure proper land preparation with adequate organic matter. Follow recommended seed treatment practices.',
    pestControl: 'Regular monitoring and integrated pest management combining cultural, biological, and chemical methods.',
    irrigation: 'Maintain optimal soil moisture. Practice water conservation through mulching and efficient irrigation.',
    fertilizer: 'Base applications on soil testing. Split nitrogen applications to improve efficiency.',
    soilType: 'Verify soil suitability through testing',
    marketInfo: {
      currentPrice: 'Variable',
      demand: 'Check local markets',
      majorMarkets: ['Contact local APMC']
    }
  };

  return cropDatabase[cropName.toLowerCase() as keyof typeof cropDatabase] || defaultCrop;
};

// Enhanced news database with categorized agricultural updates
export const getMockNewsUpdates = () => {
  return {
    governmentPolicies: [
      {
        title: 'PM-KISAN 14th Installment Released',
        summary: 'Government releases ₹2,000 under PM-KISAN scheme benefiting 8.5 crore farmers',
        date: '2024-03-01',
        source: 'Ministry of Agriculture'
      },
      {
        title: 'New MSP Announced for Rabi Crops',
        summary: 'Cabinet approves higher MSP for six rabi crops for marketing season 2024-25',
        date: '2024-02-28',
        source: 'Cabinet Committee on Economic Affairs'
      }
    ],
    weatherAlerts: [
      {
        title: 'Heavy Rainfall Alert',
        summary: 'IMD predicts heavy rainfall in central and southern regions over next week',
        date: '2024-03-02',
        severity: 'High',
        regions: ['Maharashtra', 'Karnataka', 'Telangana']
      }
    ],
    marketPrices: [
      {
        commodity: 'Wheat',
        price: '₹2,015/quintal',
        change: '+₹15',
        market: 'Karnal',
        date: '2024-03-02'
      },
      {
        commodity: 'Rice',
        price: '₹1,940/quintal',
        change: '+₹20',
        market: 'Burdwan',
        date: '2024-03-02'
      }
    ],
    innovations: [
      {
        title: 'New Drought-Resistant Wheat Variety',
        summary: 'ICAR develops new wheat variety suitable for rain-fed conditions',
        date: '2024-02-25',
        institute: 'ICAR-IARI'
      }
    ]
  };
};

// Enhanced disease analysis with detailed treatment recommendations
export const getMockDiseaseAnalysis = async (imageFile: File) => {
  const diseaseDatabase = [
    {
      name: 'Rice Blast',
      pathogen: 'Magnaporthe oryzae',
      crop: 'Rice',
      confidence: 92,
      symptoms: [
        'Diamond-shaped lesions with gray centers',
        'Dark brown margins on leaves',
        'Infected nodes turn black'
      ],
      treatment: {
        chemical: 'Apply tricyclazole @ 0.6g/L or isoprothiolane @ 1.5ml/L',
        cultural: [
          'Avoid excess nitrogen application',
          'Maintain proper spacing between plants',
          'Remove and destroy infected plant debris'
        ],
        preventive: [
          'Use resistant varieties',
          'Treat seeds with carbendazim @ 2g/kg',
          'Maintain proper water management'
        ]
      },
      impactLevel: 'Severe',
      spreadRate: 'Rapid in humid conditions'
    },
    {
      name: 'Wheat Rust',
      pathogen: 'Puccinia sp.',
      crop: 'Wheat',
      confidence: 88,
      symptoms: [
        'Reddish-brown pustules on leaves',
        'Chlorotic areas around pustules',
        'Reduced grain filling'
      ],
      treatment: {
        chemical: 'Apply propiconazole @ 0.1% or tebuconazole @ 0.1%',
        cultural: [
          'Remove alternate hosts',
          'Practice crop rotation',
          'Maintain field sanitation'
        ],
        preventive: [
          'Use resistant varieties',
          'Early sowing to escape disease',
          'Monitor regularly during susceptible stages'
        ]
      },
      impactLevel: 'Moderate to Severe',
      spreadRate: 'Very rapid in cool, moist conditions'
    }
  ];

  // Simulate processing time and return random disease
  return new Promise(resolve => {
    setTimeout(() => {
      const randomDisease = diseaseDatabase[Math.floor(Math.random() * diseaseDatabase.length)];
      resolve({
        diseaseName: randomDisease.name,
        crop: randomDisease.crop,
        confidence: randomDisease.confidence,
        treatment: `Treatment: ${randomDisease.treatment.chemical}. Cultural practices: ${randomDisease.treatment.cultural.join('. ')}`,
        symptoms: randomDisease.symptoms,
        preventiveMeasures: randomDisease.treatment.preventive
      });
    }, 3000);
  });
};