// ==UserScript==
// @name         MAO-tools
// @version      1.0.0
// @description  MAO-tools GP page
// @match        https://fttb.bee.vimpelcom.ru/ptn/ng_ptn#/adminGlobalproblem/*
// @downloadURL  https://raw.githubusercontent.com/chkzz/maotools-gp/refs/heads/main/gppage.user.js
// @updateURL    https://raw.githubusercontent.com/chkzz/maotools-gp/refs/heads/main/gppage.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  // =========================
  // ====== КОНФИГУРАЦИЯ =====
  // =========================

  const DUTY_REPORT_URL = "http://duty-report.vimpelcom.ru/fttb/api/ClientsNumber";

  const DUTY_REQUEST_HEADERS = {
  };

  const ZAVES_URL = "";
  const ENFORCE_ROLE_CHECK = false;
  const ALLOWED_GROUPS = [153, 1150];

  // =========================
  // ====== ГЛОБАЛЬНОЕ =======
  // =========================

  const ticketId = getTicketId();
  const TICKET_DETAILS_URL = "/ptn/tickets/global_ticket/";
  const HOUSE_ABON_VIEW_URL = "/ptn/house_abon_view/";
  const TKD_INFO_URL = "/ptn/proxy/get_tkd_info";

  // Запуск кнопок по условию роли (или всегда, если ENFORCE_ROLE_CHECK=false)
  (function maybeCreateButtons() {
    if (!window.location.href.includes("Globalproblem")) return;
    if (!ENFORCE_ROLE_CHECK) {
      createButtons();
      console.log("Кнопки созданы (без проверки роли)");
      return;
    }
    // Строгий режим: читаем свою “роль” из памяти Violentmonkey
    const myGroup = GM_getValue("userGroup", null);
    if (myGroup !== null && ALLOWED_GROUPS.includes(Number(myGroup))) {
      createButtons();
      console.log("Кнопки созданы (роль допущена):", myGroup);
    } else {
      console.log("Кнопок не будет — группа не указана или не в списке:", myGroup);
    }
  })();

  // Часы/тайтл
  window.onload = initTime;
  injectClockNode();

  // =========================
  // ======= ФУНКЦИИ UI ======
  // =========================

  function createButtons() {
    const buttonContainer = document.createElement("div");
    buttonContainer.style.position = "fixed";
    buttonContainer.style.top = "130px";
    buttonContainer.style.right = "40px";
    buttonContainer.style.zIndex = "9998";
    buttonContainer.style.columnCount = "1";
    buttonContainer.style.columnGap = "20px";
    document.body.appendChild(buttonContainer);

    const buttons = [
      {
        text: "ZAVES",
        clickHandler: function () {
          if (ZAVES_URL) {
            window.open(`${ZAVES_URL}#t_id=${ticketId}`, "_blank");
          } else {
            alert("ZAVES_URL не настроен в скрипте.");
          }
        },
      },
      {
        text: "Плановые ШПД/ТВ",
        clickHandler: function () {
          findEndDate();
          affectALL();
          checkCheckbox("Полное отсутствие сервиса");
          replaceDescription(
            'Плановые работы [КЦ] У клиентов IP 169, ошибки 769, 800, 752, 809, 810, 868. Не работает услуга IPTV и TVE. Роутер не выходит на линию ONLINE. СООБЩИ КЛИЕНТУ: "Имя Клиента, сейчас мы ведём техработы и улучшаем оборудование, поэтому интернет и телевидение пока не работают. Скоро всё заработает как обычно. Ориентировочно сервис заработает ХХ.ХХ. Мы оповестим Вас по SMS на контактный номер.'
          );
          selectType("Авария");
          setTimeout(() => {
            selectSubtype("Плановые работы");
          }, 600);
          selectPriority(5);
        },
      },
      {
        text: "Плановые IPTV",
        clickHandler: function () {
          findEndDate();
          selectGroup("Дежурный Инженер IPTV");
          setTimeout(() => {
            selectOperator(".ДЕЖУРНЫЙ ИНЖЕНЕР IPTV 9637111317");
          }, 600);
          uncheckCheckbox("Полное отсутствие сервиса");
          uncheckCheckbox("Интернет");
          uncheckCheckbox("TVE");
          checkCheckbox("IPTV");
          replaceDescription(
            'Плановые работы [КЦ] У клиентов не работает услуга IPTV. СООБЩИ КЛИЕНТУ: "Имя Клиента, сейчас трансляция может прерываться — ведём техработы и улучшаем оборудование. Скоро вы сможете смотреть программы как обычно. Ориентировочно сервис заработает ХХ.ХХ. Мы оповестим Вас по SMS на контактный номер.'
          );
          selectType("Авария");
          setTimeout(() => {
            selectSubtype("Плановые работы");
          }, 600);
          selectPriority(5);
        },
      },
      {
        text: "FVNO",
        clickHandler: function () {
          selectGroup("Техподдержка: Мониторинг аварийных обращений");
          setTimeout(() => {
            selectOperator("Otpmao");
          }, 600);
          checkCheckbox("Интернет");
          checkCheckbox("TVE");
          uncheckCheckbox("IPTV");
          checkCheckbox("Полное отсутствие сервиса");
          replaceDescription(
            'Не отвечает ТКД [КЦ] У клиентов: нет линка (подключение ограничено или отсутствует); любые ошибки подключения. Роутер не выходит на линию ONLINE. Не работает TVE. СООБЩИ КЛИЕНТУ: "Имя Клиента, сейчас существуют временные ограничения в работе домашнего интернета/ТВ. Неисправность обнаружена, сожалеем, что вы столкнулись с этим. Мы делаем все возможное, чтобы интернет/ТВ заработали как можно быстрее. Ориентировочно сервис заработает ХХ.ХХ Мы оповестим Вас по SMS на контактный номер.'
          );
          selectType("Авария");
          setTimeout(() => {
            selectSubtype("Авария на оборудовании ДС");
          }, 600);
          selectPriority(3);
        },
      },
      {
        text: "Сбор (неопр.)",
        clickHandler: function () {
          selectGroup("Техподдержка");
          setTimeout(() => {
            selectOperator(".Сбор примеров");
          }, 600);
          uncheckCheckbox("Заявки");
          uncheckCheckbox("Интеракции");
          replaceDescription(
            '<b>ГП для сбора статистики.</b> \n<br>Проводим полную диагностику, отписываем комментарий в ГП: \n<br>1. Заявка, логин, дата возникновения проблемы, какая проблема у клиента \n<br>2. УА2 по Orange \n<br>3. BRAS, s-vlan/c-vlan'
          );
          selectPriority(3);
          selectType("Авария");
          setTimeout(() => {
            selectSubtype("Авария на оборудовании ДС");
          }, 600);
          notVisibleByRoles("CC");
        },
      },
      { text: "Скрыть от КЦ", clickHandler: function () { notVisibleByRoles("CC"); uncheckCheckbox("Заявки"); uncheckCheckbox("Интеракции"); } },
      { text: "Скрыть от ТП2/КЦ", clickHandler: function () { notVisibleByRoles("TP2andCC"); uncheckCheckbox("Заявки"); uncheckCheckbox("Интеракции"); } },
      { text: "Скрыть от ВСЕХ", clickHandler: function () { notVisibleByRoles("ALL"); uncheckCheckbox("Заявки"); uncheckCheckbox("Интеракции"); } },
      { text: "Показать ВСЕМ", clickHandler: function () { notVisibleByRoles("NONE"); checkCheckbox("Заявки"); checkCheckbox("Интеракции"); } },
      { text: "Ответственные", clickHandler: function () { alert("Дежурный Москва: \nИвановская, Калужская, Костромская, Московская, Смоленская, Тверская, Тульская, Ярославская области"); } },
      { text: "Считалка РКЦ", clickHandler: function () { countTTandInteractions(); } },
      { text: "Формула ААБ", clickHandler: function () { DutyFormula(); } },
      { text: "Подсчет онлайна", clickHandler: function () { GPonline(); } },
      {
        text: "ВклЭАО",
        clickHandler: function () {
          navigator.clipboard.readText()
            .then(text => {
              VReplaceComment(`<b>Включен ЭАО + ${text}</b>`);
            })
            .catch(err => {
              console.error("Failed to read clipboard contents: ", err);
            });
        },
      },
      { text: "ДЕЖ МСК", clickHandler: function () { selectGroup("Дежурный инженер Мск. макрорегиона"); setTimeout(() => { selectOperator(".ДЕЖУРНЫЙ ИНЖЕНЕР 9637120933"); }, 600); } },
      { text: "ДЕЖ РЕГ", clickHandler: function () { selectGroup("Дежурный Инженер по регионам"); setTimeout(() => { selectOperator(".ДЕЖУРНЫЙ ИНЖЕНЕР по регионам 9637112136"); }, 600); } },
      { text: "ДЕЖ МАГ", clickHandler: function () { selectGroup("Дежурный инженер по магистрали"); setTimeout(() => { selectOperator(".ДЕЖУРНЫЙ ИНЖЕНЕР НМАО"); }, 600); } },
      { text: "ДЕЖ IPTV", clickHandler: function () { selectGroup("Дежурный Инженер IPTV"); setTimeout(() => { selectOperator(".ДЕЖУРНЫЙ ИНЖЕНЕР IPTV 9637111317"); }, 600); } },
      { text: "МОН TVE", clickHandler: function () { selectGroup("Техподдержка"); setTimeout(() => { selectOperator("Мониторинг TVE"); }, 600); } },
      { text: "СТ. СМЕНЫ", clickHandler: function () { selectGroup("Техподдержка"); setTimeout(() => { selectOperator(".СТАРШИЙ СМЕНЫ 0501055 доб .3 PRM"); }, 600); } },
      { text: "СБОР ПР", clickHandler: function () { selectGroup("Техподдержка"); setTimeout(() => { selectOperator(".Сбор примеров"); }, 600); } },
      { text: "МАО ТД", clickHandler: function () { selectGroup("Техподдержка: Мониторинг аварийных обращений"); setTimeout(() => { selectOperator(".Мониторинг ТП"); }, 600); } },
    ];

    buttons.forEach((buttonInfo) => {
      const btn = document.createElement("button");
      btn.textContent = buttonInfo.text;
      btn.className = "button";
      btn.style.display = "block";
      btn.style.width = "180px";
      btn.style.marginBottom = ["Сбор (неопр.)", "Показать ВСЕМ", "ВклЭАО"].includes(buttonInfo.text) ? "15px" : "8px";
      btn.addEventListener("click", buttonInfo.clickHandler);
      buttonContainer.appendChild(btn);
    });
  }

  // =========================
  // === РАБОТА С ФОРМОЙ  ====
  // =========================

  function replaceDescription(text) {
    const descriptionField = document.querySelector('textarea[name="description"]');
    if (descriptionField) {
      descriptionField.value = text;
      descriptionField.dispatchEvent(new Event("change"));
    }
  }

  function uncheckCheckbox(text) { setCheckbox(text, false); }
  function checkCheckbox(text) { setCheckbox(text, true); }

  function setCheckbox(text, checked) {
    const checkboxes = document.querySelectorAll(
      ".checkbox__label span.ng-binding.ng-scope, .checkbox__label span.ng-scope"
    );
    checkboxes.forEach((checkbox) => {
      if (checkbox.textContent.trim() === text) {
        const input = checkbox.closest(".checkbox").querySelector('input[type="checkbox"]');
        input.checked = !checked; // инверсия перед кликом — как в исходнике
        input.click();
      }
    });
  }

  function notVisibleByRoles(hideFOR) {
    const changeButton = document.querySelector('.button[ng-click="$groupsCtrl.openChangeDialog()"]');
    if (changeButton) changeButton.click();

    const checkboxes = document.querySelectorAll(".modal__body .checkbox input[type='checkbox']");

    if (hideFOR === "NONE") {
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.click();
      });
    } else {
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.click();
      });

      checkboxes.forEach((checkbox) => {
        const label = checkbox.nextElementSibling.nextElementSibling.textContent.trim();
        let shouldntHide = false;

        switch (hideFOR) {
          case "CC":
            shouldntHide =
              label === "Техподдержка: Мониторинг аварийных обращений" ||
              label === "Техподдержка" ||
              label === "ОСО";
            break;
          case "TP2andCC":
            shouldntHide =
              label === "Техподдержка: Мониторинг аварийных обращений" ||
              label === "Дежурный Инженер по регионам" ||
              label === "Дежурный инженер Мск. макрорегиона" ||
              label === "Дежурный инженер по магистрали" ||
              label === "Дежурный Инженер IPTV";
            break;
          case "ALL":
            shouldntHide = label === "Техподдержка: Мониторинг аварийных обращений";
            break;
          default:
            shouldntHide = false;
        }

        if (!shouldntHide && checkbox.checked) {
          checkbox.click();
        }
      });
    }

    const okButton = document.querySelector('.modal__footer .button[ng-click="ok(hdGroups)"]');
    if (okButton) okButton.click();
  }

  function insertEndDate(date) {
    const inputField = document.querySelector(".input-datepicker");
    if (inputField) {
      inputField.value = date;
      console.log("Установлен срок: " + date);
      inputField.dispatchEvent(new Event("change"));
    } else {
      console.error("Поле ввода не найдено.");
    }
  }

  function findEndDate() {
    const endDateText = (document.querySelector('textarea[name="description"]')?.value || "") + document.body.innerText;
    const regex = /Дата окончания работ (\d{2})\.(\d{2})\.(\d{4}) (\d{1,2}):(\d{2})/;
    const match = endDateText.match(regex);

    if (match) {
      const day = match[1];
      const month = match[2];
      const year = match[3];
      const hours = match[4].padStart(2, "0");
      const minutes = match[5];
      const endDate = `${day}.${month}.${year} ${hours}:${minutes}`;
      insertEndDate(endDate);
    } else {
      alert("Скрипт не нашёл дату окончания, нужно выставить сроки вручную.");
    }
  }

  function selectType(typeText) {
    const typeDropdown = document.querySelector('div[select-simple][initby="global.ticket.type"]');
    typeDropdown?.querySelector("button.select-simple__toggle-button")?.click();
    const typeOptions = typeDropdown?.querySelectorAll("ul.dropdown-menu a.ng-binding") || [];
    for (const option of typeOptions) {
      if (option.innerText === typeText) {
        option.click();
        break;
      }
    }
  }

  function selectSubtype(subtypeText) {
    const subtypeDropdown = document.querySelector('div[select-simple][initby="global.subtype"]');
    subtypeDropdown?.querySelector("button.select-simple__toggle-button")?.click();
    const subtypeOptions = subtypeDropdown?.querySelectorAll("ul.dropdown-menu a.ng-binding") || [];
    for (const option of subtypeOptions) {
      if (option.innerText === subtypeText) {
        option.click();
        break;
      }
    }
  }

  function selectPriority(priorityNumber) {
    const priorityDropdown = document.querySelector('div[select-simple][initby="global.ticket.priority"]');
    priorityDropdown?.querySelector("button.select-simple__toggle-button")?.click();
    const priorityOptions = priorityDropdown?.querySelectorAll("ul.dropdown-menu a.ng-binding") || [];
    for (const option of priorityOptions) {
      if (option.innerText.startsWith(priorityNumber + " приоритет")) {
        option.click();
        break;
      }
    }
  }

  function selectGroup(groupText) {
    const groupDropdown = document.querySelector('div[select-finder][initby="operator_group"]');
    const input = groupDropdown?.querySelector("input.custom-combobox-input");
    if (!input) return;
    input.focus();
    input.value = groupText;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(() => {
      const searchResults = groupDropdown.querySelectorAll("ul.dropdown-menu a.ng-binding");
      for (const result of searchResults) {
        if (result.innerText.includes(groupText)) {
          result.click();
          break;
        }
      }
    }, 400);
  }

  function selectOperator(operatorText) {
    const operatorDropdown = document.querySelector('div[select-finder][initby="operator_name"]');
    const input = operatorDropdown?.querySelector("input.custom-combobox-input");
    if (!input) return;
    input.focus();
    input.value = operatorText;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(() => {
      const searchResults = operatorDropdown.querySelectorAll("ul.dropdown-menu a.ng-binding");
      for (const result of searchResults) {
        if (result.innerText.includes(operatorText)) {
          result.click();
          break;
        }
      }
    }, 400);
  }

  // =========================
  // ====== СЧИТАЛКА РКЦ =====
  // =========================

  function countTTandInteractions() {
    console.log("ticketId:", ticketId);
    const url = `/ptn/tickets/global/affected_clients/${ticketId}?format=json&page_size=100000`;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        return response.json();
      })
      .then((response) => {
        let countGroup2 = 0;
        let countGroup153 = 0;

        if (response.results && Array.isArray(response.results)) {
          response.results.forEach((item) => {
            if (item && item._t_operator && item._t_operator.u_group === 2) countGroup2++;
            if (item && item._t_operator && item._t_operator.u_group === 153) countGroup153++;
          });
        }

        const TP2MAOCount = countGroup2 + countGroup153;

        return getCountFromInteractionsList(ticketId).then((count) => {
          if (count !== null) {
            const TotalCount = TP2MAOCount + count;
            const SummaryText =
              `Привязано заявок на роли ТП2: ${countGroup2}\n` +
              `Привязано заявок на роли МАО: ${countGroup153}\n` +
              `Сумма ТП2 и МАО: ${TP2MAOCount}\n` +
              `Привязано интеракций: ${count}\n\n` +
              `Итог: \nОбработано операторами: ${TotalCount}`;

            const needtext = confirm(SummaryText + '\n\nНужно скопировать? Нажми ОК и текст появится в поле "Комментарий"');
            if (needtext) VReplaceComment(SummaryText);
          }
        });
      })
      .catch((error) => {
        console.error("Ошибка при обработке ответа:", error);
      });
  }

  function getCountFromInteractionsList(ticketId) {
    const id = ticketId;
    if (!id) return Promise.reject(new Error("Не удалось получить ticketId."));
    const url = `/ptn/interactions_list/global_problem/${id}/?format=json`;
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Ошибка HTTP: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.hasOwnProperty("count")) return data.count;
        throw new Error("Ответ не содержит ключа 'count'.");
      });
  }

  function VReplaceComment(text) {
    const commentField = document.querySelector('textarea[name="comment"]');
    if (commentField) {
      commentField.value = text;
      commentField.dispatchEvent(new Event("change"));
    }
  }

  function getClientsCount() {
    const id = ticketId;
    if (!id) return Promise.reject(new Error("Не удалось получить ticketId."));
    const url = `/ptn/tickets/global/active_clients/${id}?format=json`;
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Ошибка HTTP: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.hasOwnProperty("active_clients") && data.hasOwnProperty("iptv_count") && data.hasOwnProperty("tve_count")) {
          const active_clients = data.active_clients;
          const iptv_count = data.iptv_count;
          const tve_count = data.tve_count;
          console.log(`Интернет: ${active_clients}, IPTV: ${iptv_count}, TVE: ${tve_count}`);
          return { active_clients, iptv_count, tve_count };
        }
        throw new Error("Ответ не содержит всех необходимых ключей.");
      });
  }

  function affectALL() {
    getClientsCount()
      .then((data) => {
        if (data.active_clients >= 1 || data.active_clients === null) {
          console.log("Устанавливаем влияние на Интернет");
          checkCheckbox("Интернет");
        } else {
          console.log("Нет влияния на Интернет, клиентов: ", data.active_clients);
          uncheckCheckbox("Интернет");
        }

        if (data.iptv_count >= 1 || data.iptv_count === null) {
          console.log("Устанавливаем влияние на IPTV");
          checkCheckbox("IPTV");
        } else {
          console.log("Нет влияния на IPTV, клиентов: ", data.iptv_count);
          uncheckCheckbox("IPTV");
        }

        if (data.tve_count >= 1 || data.tve_count === null) {
          console.log("Устанавливаем влияние на TVE");
          checkCheckbox("TVE");
        } else {
          console.log("Нет влияния на TVE, клиентов: ", data.tve_count);
          uncheckCheckbox("TVE");
        }
      })
      .catch((error) => {
        console.error("Ошибка при получении количества клиентов:", error);
      });
  }

  // =========================
  // ====== ФОРМУЛА ААБ ======
  // =========================

  function DutyFormula() {
    getClientsCount()
      .then((data) => {
        const DutyFormulaValue = (data.iptv_count + data.tve_count) * 0.7 + data.active_clients;

        return getDistrictData(ticketId)
          .then((districts) => getDistrictClientsCount(districts))
          .then((districtClientsCount) => {
            let totalFttb = 0;
            let totalIptv = 0;
            let totalTve = 0;
            for (const [, counts] of Object.entries(districtClientsCount)) {
              totalFttb += counts.fttb || 0;
              totalIptv += counts.iptv || 0;
              totalTve += counts.tve || 0;
            }

            const dutyCalc = ((totalIptv + totalTve) * 0.7 + totalFttb);
            const perc = dutyCalc ? (DutyFormulaValue / dutyCalc) * 100 : 0;

            let alertMessage =
              `ААБ FTTB: ${data.active_clients} (${totalFttb}) \n` +
              `ААБ IPTV: ${data.iptv_count} (${totalIptv}) \n` +
              `ААБ TVE: ${data.tve_count} (${totalTve}) \n\n` +
              `ААБ по формуле дежурки: ${DutyFormulaValue.toFixed()} (${dutyCalc.toFixed()}, ${perc.toFixed()}%)\n`;

            alertMessage += `\nААБ в DutyReport:\n`;
            for (const [district, counts] of Object.entries(districtClientsCount)) {
              alertMessage += `${district} - FTTB: ${counts.fttb}, IPTV: ${counts.iptv}, TVE: ${counts.tve}\n`;
            }

            alert(alertMessage);
          });
      })
      .catch((error) => {
        console.error("Ошибка при получении данных по районам:", error);
      });
  }

  // Загрузка Duty-отчёта (замена chrome.runtime.sendMessage → GM_xmlhttpRequest)
  async function getDistrictClientsCount(districts) {
    if (!DUTY_REPORT_URL) {
      console.warn("DUTY_REPORT_URL не задан — сравнение с Duty пропущено.");
      return {};
    }

    const clientsCountData = await gmFetchJSON(DUTY_REPORT_URL, "GET", null, DUTY_REQUEST_HEADERS);
    const results = {};
    districts.forEach(({ city, district }) => {
      const normalizedCity = city.trim().toLowerCase();
      const normalizedDistrict = district.trim().toLowerCase();
      const foundDistrict = findDistrictInData(clientsCountData, normalizedCity, normalizedDistrict);
      if (foundDistrict) {
        const key = `${city}: ${district}`;
        results[key] = {
          fttb: foundDistrict.fttb || 0,
          iptv: foundDistrict.iptv || 0,
          tve: foundDistrict.tve || 0,
        };
      } else {
        console.warn(`Район ${normalizedDistrict} в городе ${normalizedCity} отсутствует`);
      }
    });
    return results;
  }

  function findDistrictInData(data, cityName, districtName, path = "") {
    if (typeof data === "object" && data !== null) {
      if (Array.isArray(data)) {
        for (const item of data) {
          const result = findDistrictInData(item, cityName, districtName, path);
          if (result) return result;
        }
      } else {
        for (const key in data) {
          const normalizedKey = key.trim().toLowerCase();
          const currentPath = path ? `${path} -> ${normalizedKey}` : normalizedKey;

          if (normalizedKey === cityName.trim().toLowerCase()) {
            const districtDetails = data[key].details;
            if (districtDetails && typeof districtDetails === "object") {
              for (const districtKey in districtDetails) {
                const normalizedDistrictKey = districtKey.trim().toLowerCase();
                if (normalizedDistrictKey === districtName.trim().toLowerCase()) {
                  return districtDetails[districtKey];
                }
              }
            }
          }

          const result = findDistrictInData(data[key], cityName, districtName, currentPath);
          if (result) return result;
        }
      }
    }
    return null;
  }

  async function getDistrictData(ticketId) {
    const ticketData = await fetchTicketData(ticketId);
    const uniqueCityDistricts = new Set();

    (ticketData.houses || []).forEach((house) => {
      const city = house.city?.ct_city;
      const district = house.h_dealer?.ar_name;
      if (city && district) uniqueCityDistricts.add(JSON.stringify({ city, district }));
    });

    (ticketData.areas || []).forEach((area) => {
      const city = area.city?.ct_city;
      const district = area.ar_name;
      if (city && district) uniqueCityDistricts.add(JSON.stringify({ city, district }));
    });

    return Array.from(uniqueCityDistricts).map((item) => JSON.parse(item));
  }

  // =========================
  // === ПОДСЧЁТ ОНЛАЙНА ====
  // =========================

  async function GPonline() {
    try {
      const ticketData = await fetchData(`${TICKET_DETAILS_URL}${ticketId}`, "GET");
      await handleTicketData(ticketData);
    } catch (error) {
      console.error("Error processing ticket data:", error);
    }
  }

  async function handleTicketData(data) {
    if (data.houses && data.houses.length > 0) {
      const clientLogins = [];
      createProgressBar(data.houses.length, "fetchHouseData");

      for (const house of data.houses) {
        const houseData = await fetchData(`${HOUSE_ABON_VIEW_URL}${house.h_id}`, "GET");
        if (houseData && houseData.abons) {
          houseData.abons.forEach((abon) => {
            if (!isAbonBlocked(abon.block_type_name)) {
              clientLogins.push({
                login: abon.l_login,
                blockTypeName: abon.block_type_name,
                tv: abon.iptv_status,
                city: abon.ct_city,
                area: abon.area_name,
                streetType: abon.st_type,
                street: abon.s_street,
                house: abon.h_house,
                building: abon.h_building,
              });
            }
          });
        }
        updateProgressBar("fetchHouseData");
      }

      if (clientLogins.length > 0) {
        const totalChunks = Math.ceil(clientLogins.length / 150);
        createProgressBar(totalChunks, "fetchTKDInfo");
        await fetchTKDInfo(clientLogins, totalChunks);
      }
    } else {
      alert('Скрипт работает только с масштабом "Дом"');
    }
  }

  async function fetchTKDInfo(clientLogins, totalChunks) {
    const chunkSize = 150;
    const loginsChunks = chunkArray(clientLogins.map((c) => c.login), chunkSize);

    try {
      const responses = [];
      for (const chunk of loginsChunks) {
        const body = { logins: chunk, format: "json" };
        const response = await fetchData(TKD_INFO_URL, "POST", body);
        responses.push(response);
        await delay(200);
        updateProgressBar("fetchTKDInfo");
      }
      const data = mergeResponses(responses);
      handleTKDInfo(data, clientLogins);
    } catch (error) {
      console.error("Error fetching TKD info:", error);
    }
  }

  async function fetchData(url, method, body = null, retries = 5) {
    try {
      const options = {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: body ? JSON.stringify(body) : null,
      };
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Retrying... attempts left: ${retries}`);
        await delay(2000);
        return fetchData(url, method, body, retries - 1);
      }
      throw error;
    }
  }

  function isAbonBlocked(blockTypeName) {
    const blockedStatuses = [
      "Не определен",
      "Расторжение",
      "Заблокирован при регистрации INAC",
      "Collection",
      "Добровольно заблокирован",
      "Добровольно заблокирован Ensemble",
      "Финансовая блокировка",
      "Финансовая блокировка Ensemble",
      "Административная блокировка Ensemble",
      "Административная блокировка",
    ];
    return blockedStatuses.includes(blockTypeName);
  }

  function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
    return result;
  }

  function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  function mergeResponses(responses) {
    return responses.reduce((acc, curr) => ({ ...acc, ...curr.data }), {});
  }

  function handleTKDInfo(data, clientLogins) {
    let totalOnline = 0;
    let totalOffline = 0;
    const csvRows = ["Login;OnlineStatus;Status;TV;City;Area;Street,House;Building;HouseID;BRAS;TKD;Port"];

    clientLogins.forEach((client) => {
      const tkdData = data[client.login];
      if (tkdData) {
        const isOnline = tkdData.is_online;
        const status = isOnline ? "Online" : "Offline";
        const { house_id, gateway, ip, port } = tkdData.tkd;

        csvRows.push(
          `*${client.login};${status};${client.blockTypeName};${client.tv};${client.city};${client.area};${client.streetType} ${client.street}, д. ${client.house};${client.building};${house_id};${gateway};${ip};${port}`
        );

        if (isOnline) totalOnline++;
        else totalOffline++;
      }
    });

    const totalClients = totalOnline + totalOffline;
    const offlinePercentage = totalClients ? ((totalOffline / totalClients) * 100).toFixed(2) : "0.00";

    removeProgressBar("fetchHouseData");
    removeProgressBar("fetchTKDInfo");

    // Замена chrome.runtime.sendMessage({action:"ReportAlert", ...})
    const msg =
      `Онлайн: ${totalOnline}\n` +
      `Оффлайн: ${totalOffline}\n` +
      `Процент оффлайн: ${offlinePercentage}%\n\n` +
      `Сформировать CSV файл?`;

    if (confirm(msg)) {
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gp_${ticketId}_tkd_report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      try {
        GM_notification({ title: "GP Helper", text: "CSV сохранён", timeout: 3000 });
      } catch (e) {}
    }
  }

  // =========================
  // ===== ПРОГРЕСС-БАР ======
  // =========================

  function createProgressBar(total, id) {
    const container = document.createElement("div");
    container.id = `progress-bar-container-${id}`;
    const existing = document.querySelectorAll('div[id^="progress-bar-container-"]').length;
    container.style.position = "fixed";
    container.style.top = `${250 + 25 * existing}px`;
    container.style.right = "180px";
    container.style.width = "150px";
    container.style.padding = "5px";
    container.style.zIndex = "9999";

    const progressBar = document.createElement("div");
    progressBar.id = `progress-bar-${id}`;
    progressBar.style.width = "0%";
    progressBar.style.height = "20px";
    progressBar.style.backgroundColor = "#4caf50";

    const progressText = document.createElement("div");
    progressText.id = `progress-text-${id}`;
    progressText.style.textAlign = "center";
    progressText.style.marginTop = "-19px";
    progressText.textContent = `0 / ${total}`;

    container.appendChild(progressBar);
    container.appendChild(progressText);
    document.body.appendChild(container);
  }

  function updateProgressBar(id) {
    const progressBar = document.getElementById(`progress-bar-${id}`);
    const progressText = document.getElementById(`progress-text-${id}`);
    if (!progressBar || !progressText) return;
    const parts = progressText.textContent.split(" / ");
    const total = parseInt(parts[1], 10);
    const completed = Math.min(parseInt(parts[0], 10) + 1, total);
    progressBar.style.width = `${(completed / total) * 100}%`;
    progressText.textContent = `${completed} / ${total}`;
  }

  function removeProgressBar(id) {
    const container = document.getElementById(`progress-bar-container-${id}`);
    if (container) container.remove();
  }

  // =========================
  // ====== ТАЙТЛ/ЧАСЫ =======
  // =========================

  function getTicketId() {
    const url = window.location.href;
    const match = url.match(/\/adminGlobalproblem\/(\d+)$/);
    return match ? match[1] : null;
  }

  async function fetchTicketData(ticketId) {
    const response = await fetch(`/ptn/tickets/global_ticket/${ticketId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return response.json();
  }

  async function fetchCityInfo(ctId) {
    const response = await fetch(`/ptn/main_page/city_info/${ctId}/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return response.json();
  }

  function displayTime(timeShift) {
    const now = new Date();
    const moscowOffset = 3 * 60 * 60 * 1000;
    const moscowTime = new Date(now.getTime() + moscowOffset);
    const localTime = new Date(moscowTime.getTime() + timeShift * 60 * 60 * 1000);
    const hours = String(localTime.getUTCHours()).padStart(2, "0");
    const minutes = String(localTime.getUTCMinutes()).padStart(2, "0");
    const el = document.getElementById("time-display");
    if (el) el.textContent = `${hours}:${minutes}`;
  }

  async function initTime() {
    if (!ticketId) return;
    const ticketData = await fetchTicketData(ticketId);
    let ctId = null;

    if (ticketData.scale?.value === 2) {
      ctId = ticketData.houses?.[0]?.city?.ct_id;
      document.title = `ГП ${ticketData.ticket.t_number}, ${ticketData.houses?.[0]?.city?.ct_city} | HelpDesk`;
    } else if (ticketData.scale?.value === 1) {
      ctId = ticketData.areas?.[0]?.city?.ct_id;
      document.title = `ГП ${ticketData.ticket.t_number}, ${ticketData.areas?.[0]?.city?.ct_city} | HelpDesk`;
    } else {
      document.title = `ГП ${ticketData.ticket.t_number}, Вся сеть,  | HelpDesk`;
      console.log("Часы не показываются для данного тикета.");
      return;
    }

    const cityInfo = await fetchCityInfo(ctId);
    const timeShift = cityInfo.ct_time_shift;
    displayTime(timeShift);
    setInterval(() => displayTime(timeShift), 1000);
  }

  function injectClockNode() {
    const timeDisplayElement = document.createElement("div");
    timeDisplayElement.id = "time-display";
    timeDisplayElement.style.position = "fixed";
    timeDisplayElement.style.top = "100px";
    timeDisplayElement.style.right = "70px";
    timeDisplayElement.style.fontSize = "24px";
    timeDisplayElement.style.fontWeight = "bold";
    timeDisplayElement.style.padding = "5px";
    timeDisplayElement.style.borderRadius = "5px";
    timeDisplayElement.style.zIndex = "1000";
    timeDisplayElement.title = "Местное время";
    document.body.appendChild(timeDisplayElement);
  }

  // =========================
  // ====== ПОМОЩНИКИ GM =====
  // =========================

  // Универсальный JSON-запрос через GM_xmlhttpRequest (включая кросс-доменные с куками)
  function gmFetchJSON(url, method = "GET", data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        url,
        method,
        data: data ? JSON.stringify(data) : null,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        timeout: 30000,
        // В Violentmonkey: anonymous=false → отправлять куки; true → без куков.
        anonymous: false,
        onload: (res) => {
          try {
            if (res.status < 200 || res.status >= 300) {
              reject(new Error(`HTTP ${res.status}: ${res.responseText?.slice(0, 200)}`));
              return;
            }
            const json = JSON.parse(res.responseText || "{}");
            resolve(json);
          } catch (e) {
            reject(e);
          }
        },
        onerror: (e) => reject(e),
        ontimeout: () => reject(new Error("GM_xmlhttpRequest timeout")),
      });
    });
  }
})();
