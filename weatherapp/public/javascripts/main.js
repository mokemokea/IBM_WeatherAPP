document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("geocodeForm");
    const locationSelect = document.getElementById("locationSelect");
    const geocodeDisplay = document.getElementById("geocodeDisplay");
    const addGeocodeButton = document.getElementById("addGeocode");

      // タブボタン
    const tab1Button = document.getElementById("tab1-button");
    const tab2Button = document.getElementById("tab2-button");
    const tab3Button = document.getElementById("tab3-button");

    // タブの内容
    const tab1 = document.getElementById("tab1");
    const tab2 = document.getElementById("tab2");
    const tab3 = document.getElementById("tab3");

    // タブ1をデフォルトで表示
    tab1.style.display = "block";
    tab2.style.display = "none";
    tab3.style.display = "none";
    
    // タブボタンのクリックイベント
    tab1Button.addEventListener("click", function() {
      setActiveTab(tab1Button, [tab2Button, tab3Button]);
      tab1.style.display = "block";
      tab2.style.display = "none";
      tab3.style.display = "none";
    });
  
    tab2Button.addEventListener("click", function() {
      setActiveTab(tab2Button, [tab1Button, tab3Button]);
      tab1.style.display = "none";
      tab2.style.display = "block";
      tab3.style.display = "none";
    });
  
    tab3Button.addEventListener("click", function() {
      setActiveTab(tab3Button, [tab1Button, tab2Button]);
      tab1.style.display = "none";
      tab2.style.display = "none";
      tab3.style.display = "block";
    });

    function setActiveTab(active, inactiveButtons) {
      active.classList.add("active-tab");
      inactiveButtons.forEach(button => button.classList.remove("active-tab"));
    }


    /*ローカルストレージからデータを取得*/
    function populateSelect() {
      let savedLocations = JSON.parse(localStorage.getItem('locations')) || [];
      // ローカルストレージにデータがない場合は初期データを保存
      if (savedLocations.length === 0) {
        const initialLocations = [
          { name: '東京都', geocode: "35.68,139.76" },
          { name: '愛知県', geocode: "35.18,136.91" },
          { name: '大阪府', geocode: "34.69,135.50" },
        ];
        savedLocations = initialLocations;
        localStorage.setItem("locations", JSON.stringify(initialLocations));
      }

      locationSelect.innerHTML = '';

      for(const location of savedLocations) {
          const option = document.createElement('option');
          option.value = location.geocode;
          option.textContent = location.name;
          locationSelect.appendChild(option);
      }
    }
    populateSelect(); // 初期値のセット

    //リストから選択した座標情報表示の初期化
    geocodeDisplay.textContent = locationSelect.value;
    // セレクトボックスが変更された時の処理
    locationSelect.addEventListener("change", function() {
      geocodeDisplay.textContent = locationSelect.value;
    });

    //地域の追加
    addGeocodeButton.addEventListener("click", function(event) {
      event.preventDefault();

      const newGeocodeName = document.getElementById("newGeocodeName").value;
      const newGeocode = document.getElementById("newGeocode").value;
      
      if(newGeocodeName && newGeocode) {
        // ローカルストレージに保存
        const savedLocations = JSON.parse(localStorage.getItem('locations')) || [];
        savedLocations.push({ name: newGeocodeName, geocode: newGeocode });
        localStorage.setItem('locations', JSON.stringify(savedLocations));

        // セレクトボックスの更新
        populateSelect();
        
      }
    });
    
    /*updateボタンが押されたら*/
    form.addEventListener("submit", function(event) {
      event.preventDefault();
      const formData = new FormData(form);
      const selectedGeocode = formData.get("geocode");
      const selectedLocationName = locationSelect.options[locationSelect.selectedIndex].text;
      const startDateTime = formData.get("startDateTime");
      const endDateTime = formData.get("endDateTime");

      const loadingDiv = document.getElementById("loading");
      loadingDiv.style.display = "block";
  
      fetch(`/update-weather?geocode=${selectedGeocode}&name=${selectedLocationName}&startDateTime=${startDateTime}T00Z&endDateTime=${endDateTime}T23Z`)
        .then(response => response.json())
        .then(data => {
          const dataList_1 = document.getElementById("DailyWeatherInfo");
          dataList_1.innerHTML = ''; // 既存のリストをクリア
          const C_data_tmp1=[];
          const C_data_tmp2=[];
          const pointBackgroundColors=[];

  
          if (Object.keys(data.DailyData).length > 0) {
            let newInnerHTML = '<h2>日別データ:</h2>';
            newInnerHTML += `    
            <div style="display: flex;">
              <div style="background-color: white;">
                <canvas id="myScatterChart1" style="width:600px;height:600px;"></canvas>
              </div>
              <div style="background-color: white;">
                <canvas id="myScatterChart2" style="width:600px;height:600px;"></canvas>
              </div>
            </div>
            <strong>日付</strong>|天気|平均気温|平均湿度|推定客単価|推定客数|<strong>推定エリア売り上げ</strong>`;
  
            for (let date in data.DailyData) {
              newInnerHTML += `
                <ul><strong>${date}</strong>|
                ${data.DailyData[date].dailyWeather}|
                ${Math.floor((data.DailyData[date].dailyAverageTemperature*100))/100}℃|
                ${Math.floor((data.DailyData[date].dailyAverageHumidity*100))/100}%|
                ${Math.floor((data.DailyData[date].Estimated_customer_spend*100))/100}円|
                ${Math.floor((data.DailyData[date].Estimated_number_customers*100))/100}人|
                <strong>
                ${Math.floor((data.DailyData[date].Estimated_area_sales*100))/100}円
                </strong>
                </ul>
              `;
              C_data_tmp1.push({x: Math.floor((data.DailyData[date].dailyAverageTemperature*100))/100,y: Math.floor((data.DailyData[date].Estimated_area_sales*100))/100})
              C_data_tmp2.push({x: Math.floor((data.DailyData[date].dailyAverageHumidity*100))/100,y: Math.floor((data.DailyData[date].Estimated_area_sales*100))/100})
              switch(data.DailyData[date].dailyWeather) {
                case "Rain":
                  pointBackgroundColors.push('blue');
                  break;
                case "Cloud":
                  pointBackgroundColors.push('gray');
                  break;
                case "Sunny":
                  pointBackgroundColors.push('red');
                  break;
                case "Snow":
                  pointBackgroundColors.push('lightblue');  
                  break;
                default:
                  pointBackgroundColors.push('black');  // デフォルトの色
                  break;
              }



            }
            
            dataList_1.innerHTML = newInnerHTML;
          } else {
            dataList_1.innerHTML = '<p>No updated weather data available.</p>';
          }
          const ctx1 = document.getElementById('myScatterChart1').getContext('2d');//散布図の取得

          const scatterChart1 = new Chart(ctx1, {
            type: 'scatter',
            options: {
              responsive: false,
              scales: {
                x: {
                  title: {
                    display: true,
                    text: '平均気温(℃)',  // ここにx軸のラベルを設定
                    font: {
                      size: 18 // フォントサイズを18に設定
                    }
                  },
                },
                y: {
                  title: {
                    display: true,
                    text: '推定エリア売り上げ(円)',  // ここにy軸のラベルを設定
                    font: {
                      size: 18 // フォントサイズを18に設定
                    }
                  },
                },
              },
            },
            data: {
              datasets: [{
                label:"推定エリア売り上げ:平均気温",
                data: C_data_tmp1,
                pointBackgroundColor: pointBackgroundColors,
                pointRadius: 5 
              }]
            },
          });
          const ctx2 = document.getElementById('myScatterChart2').getContext('2d');//散布図の取得

          const scatterChart2 = new Chart(ctx2, {
            type: 'scatter',
            options: {
              responsive: false,
              scales: {
                x: {
                  title: {
                    display: true,
                    text: '平均湿度(%)',  // ここにx軸のラベルを設定
                    font: {
                      size: 18 // フォントサイズを18に設定
                    }
                  },
                },
                y: {
                  title: {
                    display: true,
                    text: '推定エリア売り上げ(円)',  // ここにy軸のラベルを設定
                    font: {
                      size: 18 // フォントサイズを18に設定
                    }
                  },
                },
                
              },
            },
            data: {
              datasets: [{
                label:"推定エリア売り上げ:平均湿度",
                data: C_data_tmp2,
                pointBackgroundColor: pointBackgroundColors,
                pointRadius: 5 
              }]
            },
          });


          const dataList_2 = document.getElementById("ternaryMonthlyDataWeatherInfo");
          dataList_2.innerHTML = ''; // 既存のリストをクリア
  
          if (Object.keys(data.DailyData).length > 0) {
            let newInnerHTML = '<h3>上中下旬別データ:</h3>';
            newInnerHTML += '<strong>日付~時期</strong>|天気比|平均気温|平均湿度';
  
            for (let month in data.ternaryMonthlyData) {
              for (let season in data.ternaryMonthlyData[month]) {
              newInnerHTML += `
              <ul><strong>${month }~${season }</strong>|
              ${JSON.stringify(data.ternaryMonthlyData[month][season].weatherConditionCount) }|
              ${Math.floor((data.ternaryMonthlyData[month][season].temp*100))/100 }℃|
              ${Math.floor((data.ternaryMonthlyData[month][season].humidity*100))/100 }%</ul>
              `;
              }
            }
            
            dataList_2.innerHTML = newInnerHTML;
          } else {
            dataList_2.innerHTML = '<p>No updated weather data available.</p>';
          }

          const dataList_3 = document.getElementById("MonthlyDataWeatherInfo");
          dataList_3.innerHTML = ''; // 既存のリストをクリア
  
          if (Object.keys(data.DailyData).length > 0) {
            let newInnerHTML = '<h4>月別データ:</h4>';
            newInnerHTML += '<strong>日付</strong>|天気比|平均気温|平均湿度';
  
            for (let month in data.monthlyData) {
              newInnerHTML += `
              <ul><strong>${month }</strong>|
              ${JSON.stringify(data.monthlyData[month].weatherConditionCount) }|
              ${Math.floor((data.monthlyData[month].temp*100))/100 }℃|
              ${Math.floor((data.monthlyData[month].humidity*100))/100 }%</ul>
              `;
            }
            
            dataList_3.innerHTML = newInnerHTML;
          } else {
            dataList_3.innerHTML = '<p>No updated weather data available.</p>';
          }
        })
        .catch(error => {
          console.error('Error:', error);
        })
        .finally(() => {
          // 読み込みが終わったら読み込み中のDivを非表示にする
          loadingDiv.style.display = "none";
        });
    });
  });
  