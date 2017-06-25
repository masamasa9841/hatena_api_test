//SlackAppのLibrary Key →　M3W5Ut3Q39AaIwLquryEPMwV62A3znfOO
function main () {//main関数
  var hatena = new Hatena ();
  var bookmark = hatena.get_bookmark ();
  hatena.kaki(bookmark);
}

Hatena = function (){//コンストラクタ
  this.bk = SpreadsheetApp.getActiveSpreadsheet();
  this.sheet = this.bk.getSheetByName("hatena"); //hatenaというシートを取得
  this.slack = this.sheet.getRange(1, 6).getValue();//slack_api取得
  this.mail = this.sheet.getRange(2, 6).getValue();//メールアドレスを取得
  this.last_row = this.sheet.getLastRow();  //最終行を検出
  if (!this.slack && !this.mail) return;
}

Hatena.prototype.get_bookmark = function (){//bookmarkの取得
  var url = [];
  var url_50 = 0;
  var url_count = 0;
  var hatena_api_url = "http://api.b.st-hatena.com/entry.counts?url=";//複数のurl
  for (var i = 2; i <= this.last_row; i++) {  //最終行までurlを取得
    if (url_count >= 50){//一度に50個まで
      url_count = 0;
      url_50 += 1;
    }
    if (url_count == 0) url[url_50] = this.sheet.getRange(i,1).getValue();//最初だけは
    else url[url_50] += '&url=' + this.sheet.getRange(i,1).getValue();//urlを足して行く
    url_count += 1;
  }
  var url_json = {};
  for (var i = 0; i <=url.length; i++) {
    var api_url = hatena_api_url + url[i];
    try {
      var response = UrlFetchApp.fetch(api_url);//はてなapiに投げる(極まれにエラー出る)  
      var json=JSON.parse(response.getContentText());//jsonを読み込む
      for(key in json) url_json[key] = json[key];//結合
    }
    catch (e) {
      return;
    }
  }
  return url_json;
}

Hatena.prototype.kaki = function (url_json){//bookmarkとタイトルを上書きする
  if (url_json) for (var i = 2; i <= this.last_row; i++) {
    this.url = this.sheet.getRange(i,1).getValue();
    this.old_bookmark = this.sheet.getRange(i, 3).getValue();
    this.new_bookmark = url_json[this.url];
    this.kp = this.new_bookmark - this.old_bookmark;//差分
    if (this.old_bookmark){
      this.title = this.sheet.getRange(i, 2).getValue();//タイトルをシートから取得
      if (this.kp > 0) {
        Logger.log("増えた");
        this.sheet.getRange(i, 3).setValue(this.new_bookmark);//ブックマークを上書き
        if (this.slack) this.send_slack();
        //if (this.mail) this.send_mail();
      }
      else if (this.kp < 0){//ブックマークが減ったら
        Logger.log("減った");
        this.sheet.getRange(i, 3).setValue(this.new_bookmark);//ブックマークを上書き
        if (this.slack) this.send_slack();
        //if (this.mail) this.send_mail();
      }
    }
    else {//初めてのbookmark
      Logger.log("初めて");
      if (this.new_bookmark != 0) {
        this.title = this.get_title();
        this.sheet.getRange(i, 2).setValue(this.title);//タイトルを挿入
        this.sheet.getRange(i, 3).setValue(this.new_bookmark);//ブックマークを上書き
        if (this.slack) this.send_slack();
        //if (this.mail) this.send_mail();
      }
    }
  }
}

Hatena.prototype.get_title = function (){ //タイトルを取得する
  try{
    var api_url = "http://b.hatena.ne.jp/entry/jsonlite/?url=" + this.url;
    var response = UrlFetchApp.fetch(api_url);//はてなapiに投げる(極まれにエラー出る)     
  }
  catch (e){//エラーだった場合
    return;
  }
  if (response != "null"){//結果が帰ってくれば
    var json=JSON.parse(response.getContentText());//jsonを読み込む
    var title = json["title"];//タイトルを取得
  }
  return title;
}

Hatena.prototype.send_slack= function (){ //タイトルを取得する
  var kp_mes;
  if (this.kp > 0) kp_mes = "増えました。";
  else {
    kp_mes = "減りました。";
    this.kp = -this.kp;//減った時は"-"をかける
  }
  var slack_title = "*<" + this.url + "|" + this.title + ">*"//タイトルをリンクにする
  var mes = slack_title + "\n" + ">はてブ数が" + " `" + this.kp + "` " + kp_mes +"現在"　+ this.new_bookmark + "はてブ。";
  this.postSlackMessage(mes);//送れ
}

Hatena.prototype.postSlackMessage = function(mes) {//slackに投稿する関数
  var slackApp = SlackApp.create(this.slack); //SlackApp インスタンスの取得
  var options = {
    channelId: "#auto-hatena", //チャンネル名
    userName: "bot", //投稿するbotの名前
    message: mes //投稿するメッセージ
  };
  slackApp.postMessage(options.channelId, options.message, {username: options.userName});//送信
}

Hatena.prototype.send_mail = function (){//メールを送る
  var kp_mes;
  if (this.kp > 0) kp_mes = "増えました。";
  else {
    kp_mes = "減りました。";
    this.kp = -this.kp;//減った時は"-"をかける
  }
  var mail_title = this.new_bookmark + "はてブ---" + this.title;
  var mes = this.title + "\n" + "はてブ数が" + this.kp + kp_mes +"現在"　+ this.new_bookmark + "はてブ。";
  MailApp.sendEmail(this.mail, mail_title, mes);
}

function add_url (){//urlを追加
  var url = "http://routecompass.net";
  var atom = "http://purl.org/rss/1.0/";
  var rss_url = "http://b.hatena.ne.jp/entrylist?url=" + url + "&mode=rss&sort=eid";
  var response = UrlFetchApp.fetch(rss_url);
  Logger.log(response);
    var xml =XmlService.createElement(response, atom);
  
  //var entries = xml.getChildren('item', atom);
  Logger.log(xml);
}


