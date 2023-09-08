const express = require('express');
const axios = require('axios');
const fs = require('fs');
const  router = express.Router();

const apiKey = '7698370dea91420198370dea91720199'; // APIキーを設定

const XLSX = require('xlsx');
const path = require('path');

module.exports = router;

/*一日の区切りを判別*/
function findT23(validTimeUtc,index) {
  const Oneday = [];
  for (let i = index; i < validTimeUtc.length; i++) {
    Oneday.push(validTimeUtc[i]);
    if (validTimeUtc[i].includes("T23")) {
      break;
    }
  }
  return Oneday;
}

/*1日の天気を判別*/
function Weather_judge(iconCode){
  // For weather condition count
  const weatherConditionCount = { "Rain": 0, "Cloud": 0, "Sunny": 0,"Snow": 0  };
  for(let icon of iconCode){
    if (icon <= 12||icon == 35||(icon >= 38)&&(icon <= 40)||icon == 47) {
      weatherConditionCount.Rain++;
    } else if(icon <= 18||icon == 25||(icon >= 41)&&(icon <= 43)){
      weatherConditionCount.Snow++;
    } else if (icon <= 30) {
      weatherConditionCount.Cloud++;
    } else {
      weatherConditionCount.Sunny++;
    }
  }
  //0:雨,1:曇り,2:晴れ,3:雪
  let maxKey = null;
  let maxValue = -1;
  
  // キーと値のペアを走査
  for (const [key, value] of Object.entries(weatherConditionCount)) {
    if (value > maxValue) {
      maxKey = key;
      maxValue = value;
    }
  }
  
  return maxKey; 
}

/*入力配列の平均値算出*/
function calculateAverage(arr) {
  // 配列の全要素を合計
  const sum = arr.reduce((a, b) => a + b, 0);
  // 配列の要素数で割る
  const average = sum / arr.length; 
  
  return average;
}

/*データ形成*/
function processWeatherData(weatherDataArray) { 
  /*
  const DailyData = {
    "2023-09-01": {
      "temperature": [22, 23, 21, 20, 19, 21, 24, 27, 28, 26, 25, 24, 23, 22, 21, 20, 19, 21, 22, 24, 25, 24, 23, 22],
      "humidity": [55, 56, 54, 55, 60, 61, 55, 50, 45, 50, 55, 54, 55, 56, 57, 58, 59, 58, 57, 56, 55, 54, 53, 52],
      "iconCode": [55, 56, 54, 55, 60, 61, 55, 50, 45, 50, 55, 54, 55, 56, 57, 58, 59, 58, 57, 56, 55, 54, 53, 52]
    },
    "2023-09-02": {
      // ここに9月2日のデータ
    },
    // ... 他の日付
  };*/

  /*DaylyDataの取得 */
  let DailyData = {}
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //DailyData=getExistingData();
  
  for(let index = 0;index<weatherDataArray.validTimeUtc.length;){
    let Dailydata = {
      "Date":null,
      "time":[],
      "temperature":[],
      "humidity":[],
      "iconCode": [],
  
      "dailyAverageTemperature":-100,
      "dailyAverageHumidity":-100,
      "dailyWeather":null//0:雨,1:曇り,2:晴れ,3:雪
    };
    //Dailydataの各値決定
    Dailydata.time = findT23(weatherDataArray.validTimeUtc, index);
    Dailydata.Date = Dailydata.time[0].split("T")[0];
    Dailydata.temperature = weatherDataArray.temperature.slice(index,index+Dailydata.time.length);
    Dailydata.humidity = weatherDataArray.relativeHumidity.slice(index,index+Dailydata.time.length);
    Dailydata.iconCode = weatherDataArray.iconCode.slice(index,index+Dailydata.time.length);

    Dailydata.dailyAverageTemperature=calculateAverage(Dailydata.temperature)
    Dailydata.dailyAverageHumidity=calculateAverage(Dailydata.humidity)
    Dailydata.dailyWeather = Weather_judge(Dailydata.iconCode)

    index += Dailydata.time.length;
    DailyData[Dailydata.Date]=JSON.parse(JSON.stringify(Dailydata))
  }
  

  let { monthlyData, ternaryMonthlyData }=aggregateMonthlyData(DailyData)
  return {"DailyData":DailyData,"ternaryMonthlyData":ternaryMonthlyData,"monthlyData":monthlyData};
}

/*月別データの生成 */
function aggregateMonthlyData(data) {
  const monthlyData = {};
   /*
  const monthlyData = {
    "2023-09": {
      "temperature": [ailyAverageTemperature*30],
      "humidity": [dailyAverageHumidity*30],
      "days": 0
      "weather": [dailyWeather*30]
      "weatherConditionCount" = { "Rain": 0, "Cloud": 0, "Sunny": 0 };
    },*/
  const ternaryMonthlyData = {};

  for (const date in data) {
    const yearMonth = date.slice(0, 7); // 'YYYY-MM'
    const day = parseInt(date.slice(8, 10)); // DD
    const dailyData = data[date];

    if (!monthlyData[yearMonth]) {
      monthlyData[yearMonth] = { temp: 0, humidity: 0, days: 0,weather:[], weatherConditionCount:{ "Rain": 0, "Cloud": 0, "Sunny": 0,"Snow": 0 }};
    }

    const ternaryKey = day <= 10 ? 'early' : day <= 20 ? 'mid' : 'late';

    if (!ternaryMonthlyData[yearMonth]) {
      ternaryMonthlyData[yearMonth] = {
        'early': { temp: 0, humidity: 0, days: 0, weather: [], weatherConditionCount: { "Rain": 0, "Cloud": 0, "Sunny": 0,"Snow": 0  } },
        'mid': { temp: 0, humidity: 0, days: 0, weather: [], weatherConditionCount: { "Rain": 0, "Cloud": 0, "Sunny": 0,"Snow": 0  } },
        'late': { temp: 0, humidity: 0, days: 0, weather: [], weatherConditionCount: { "Rain": 0, "Cloud": 0, "Sunny": 0,"Snow": 0  } }
      };
    }
    
    monthlyData[yearMonth].temp += dailyData.dailyAverageTemperature;
    monthlyData[yearMonth].humidity += dailyData.dailyAverageHumidity;
    monthlyData[yearMonth].days++;
    monthlyData[yearMonth].weather.push(dailyData.dailyWeather);
    monthlyData[yearMonth].weatherConditionCount[dailyData.dailyWeather]++;

    ternaryMonthlyData[yearMonth][ternaryKey].temp += dailyData.dailyAverageTemperature;
    ternaryMonthlyData[yearMonth][ternaryKey].humidity += dailyData.dailyAverageHumidity;
    ternaryMonthlyData[yearMonth][ternaryKey].days++;
    ternaryMonthlyData[yearMonth][ternaryKey].weather.push(dailyData.dailyWeather);
    ternaryMonthlyData[yearMonth][ternaryKey].weatherConditionCount[dailyData.dailyWeather]++;
  }

  // 平均値算出
  for (const yearMonth in monthlyData) {
    const data = monthlyData[yearMonth];
    data.temp /= data.days;
    data.humidity /= data.days;
  }

  for (const yearMonth in ternaryMonthlyData) {
    for (const  ternaryKey in ternaryMonthlyData[yearMonth]) {
      const data = ternaryMonthlyData[yearMonth][ternaryKey];
      data.temp /= data.days;
      data.humidity /= data.days;
    }
  }

  return { monthlyData, ternaryMonthlyData };
}

function proceedsCaliculate(allSheetData,processedData,PrefectureName){

  const BaseData_2022={
    spend:{
      "2022-01":[],
      "2022-02":[],
      "2022-03":[],
      "2022-04":[],
      "2022-05":[],
      "2022-06":[],
      "2022-07":[],
      "2022-08":[],
      "2022-09":[],
      "2022-10":[],
      "2022-11":[],
      "2022-12":[],   
    },
    customers:{
      "2022-01":[],
      "2022-02":[],
      "2022-03":[],
      "2022-04":[],
      "2022-05":[],
      "2022-06":[],
      "2022-07":[],
      "2022-08":[],
      "2022-09":[],
      "2022-10":[],
      "2022-11":[],
      "2022-12":[],   
    }
  }
  const BaseData_keys=["2022-01","2022-02","2022-03","2022-04","2022-05","2022-06","2022-07","2022-08","2022-09","2022-10","2022-11","2022-12"];
  const Excel_customer_keys=["Jan","Feb","Mar","Apr","May","Jun","Jul" ,"Aug","Sep","Oct","Nov","Dec"];
  const Excel_spend_keys=["__EMPTY_1",
  "__EMPTY_2",
  "__EMPTY_3",
  "__EMPTY_4",
  "__EMPTY_5",
  "__EMPTY_6",
  "__EMPTY_7",
  "__EMPTY_8",
  "__EMPTY_9",
  "__EMPTY_10",
  "__EMPTY_11",
  "__EMPTY_12"];
  /* 
  {
    '月別係数': '晴れ',
    __EMPTY_1: '曇り',
    __EMPTY_2: '雨',
    __EMPTY_3: '雪',
    __EMPTY_4: 'その他悪天候'
  },
  {
    __EMPTY: '係数値',
    '月別係数': 1.2,
    __EMPTY_1: 1,
    __EMPTY_2: 0.86,
    __EMPTY_3: 0.81,
    __EMPTY_4: 0.78
  }
  と言ったように係数系列のデータ取得が難しかったため，直接入力にて対応  
  */
  const Month_coefficient=[0.847408044,0.757757442,1.106163901,1.034304593,0.943432374,0.931305888,0.98268383,0.915215709,0.929113322,0.960179034,0.989559408,1.602876455];//1月から12月の月別係数
  const day_of_week_coefficient=[1.1,1.1,0.9,0.95,1,1,1.2];//日曜から土曜の曜日係数
  const weather_coefficient={"Rain": 0.86, "Cloud": 1, "Sunny": 1.2,"Snow": 0.81}
  
  let skip_boolean=true;
  for(let BaseDate of allSheetData["BaseData2022"]){
    if(skip_boolean){
      skip_boolean=false;
      continue;
    }
    let index=0;
    for(let BaseData_key of BaseData_keys){
      if(BaseDate[Excel_spend_keys[index]])BaseData_2022.spend[BaseData_key].push(BaseDate[Excel_spend_keys[index]]);
      if(BaseDate[Excel_customer_keys[index]])BaseData_2022.customers[BaseData_key].push(BaseDate[Excel_customer_keys[index]]);
      index++;
    }
  }
  //都道府県係数の取得
  const PrefectureDatas={}
  for(let PrefectureData of allSheetData["都道府県係数"]){
    const Prefecture_num=parseInt(PrefectureData['総数'].split('軒').join(''));
    const Prefecture_coefficient=parseFloat(PrefectureData['都道府県係数'])
    PrefectureDatas[PrefectureData['都道府県名']]={"Prefecture_num":Prefecture_num,"Prefecture_coefficient":Prefecture_coefficient};
  }
  

  for (const date in processedData.DailyData) {
    const yearMonth = date.slice(0, 7); // 'YYYY-MM'
    const Int_month = parseInt(date.slice(5, 7))//Int MM
    const day = parseInt(date.slice(8, 10)); // DD
    const Int_day = parseInt(day, 10);//Int DD
    const Int_day_of_week = (new Date(date)).getDay();// 曜日を取得（0: 日曜, 1: 月曜, ..., 6: 土曜）
    const dailyData = processedData.DailyData[date];

    //推定客単価の算出
    const Estimated_customer_spend = BaseData_2022.spend[yearMonth][Int_day-1]*Month_coefficient[Int_month-1]*day_of_week_coefficient[Int_day_of_week];
    //推定客数の算出
    const Estimated_number_customers = BaseData_2022.customers[yearMonth][Int_day - 1] * Month_coefficient[Int_month - 1] *day_of_week_coefficient[Int_day_of_week]* PrefectureDatas[PrefectureName].Prefecture_coefficient * weather_coefficient[dailyData.dailyWeather];;
    //推定エリア売り上げの算出
    const Estimated_area_sales = Estimated_customer_spend*Estimated_number_customers*PrefectureDatas[PrefectureName].Prefecture_num;

    processedData.DailyData[date]["Estimated_customer_spend"]=Estimated_customer_spend;
    processedData.DailyData[date]["Estimated_number_customers"]=Estimated_number_customers;
    processedData.DailyData[date]["Estimated_area_sales"]=Estimated_area_sales;
  }
  //console.log(processedData.DailyData)

}

/* Updateボタンを押したときの処理 */
router.get('/update-weather', async function(req, res) {
  let processedData = null;
  const name = req.query.name ||"東京都";
  try {
    const geocode = req.query.geocode || '35.65,135.79';
    const startDateTime = req.query.startDateTime || '2022-11-01T00Z';
    const endDateTime = req.query.endDateTime || '2022-11-30T23Z';
    const url = `https://api.weather.com/v3/wx/hod/r1/direct?geocode=${geocode}&startDateTime=${startDateTime}&endDateTime=${endDateTime}&format=json&units=m&language=ja-JP&apiKey=${apiKey}`;
    const response = await axios.get(url);
    const weather = response.data;

    processedData = processWeatherData(weather);
  } catch (error) {
    console.error("API call failed: ", error);
    processedData = getExistingData();
  }
  ///*売り上げ計算*///
  // `routes` フォルダの親ディレクトリに移動して、Excelファイルのフルパスを生成
  const excelPath = path.join(__dirname, '../simulate_data.xlsx');
    
  // Excelファイルを読み込む
  const workbook = XLSX.readFile(excelPath);
  // すべてのワークシートのデータを格納するためのオブジェクト
  const allSheetData = {};
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    allSheetData[sheetName] = jsonData;
  });
  //console.log(allSheetData);
  proceedsCaliculate(allSheetData,processedData,name);

  res.json(processedData);
});

/*APIの読み込みエラー時既存ファイルからデータを読み込む*/
function getExistingData() {
  try {
    const data = fs.readFileSync('processedData.txt', 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Could not read from processedData.txt: ", error);
    return null;
  }
}

/* 起動時 */
router.get('/', async function(req, res, next) {
  const name = "東京都";
  let processedData = null;
  try{
    const url = `https://api.weather.com/v3/wx/hod/r1/direct?geocode=35.68,139.76&startDateTime=2022-01-01T00Z&endDateTime=2022-01-31T23Z&format=json&units=m&apiKey=${apiKey}`;
    const response = await axios.get(url);
    const weather = response.data;
    
    processedData = processWeatherData(weather);
    //console.log(processedData.DailyData)
    /* データをテキストファイルとして保存
    fs.writeFileSync('processedData.txt', JSON.stringify(processedData, null, 2));
    */

  } catch (error) {
    console.error("API call failed: ", error);
    processedData = getExistingData();
  }
  //console.log(processedData)
  
  ///*売り上げ計算*///
  // `routes` フォルダの親ディレクトリに移動して、Excelファイルのフルパスを生成
  const excelPath = path.join(__dirname, '../simulate_data.xlsx');
    
  // Excelファイルを読み込む
  const workbook = XLSX.readFile(excelPath);
  // すべてのワークシートのデータを格納するためのオブジェクト
  const allSheetData = {};
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    allSheetData[sheetName] = jsonData;
  });
  //console.log(allSheetData);
  proceedsCaliculate(allSheetData,processedData,name);
  
  
  res.render('index', { title: 'Weather App',  processedData});
});

module.exports = router;

