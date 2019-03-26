// 参数对转成字符串
function paramsToStr(params)
{
	// 按参数名的字典序排序

	params.sort(function(a,b){
		if(a[0] < b[0]) return -1;
		else if(a[0] > b[0]) return 1;
		return 0;
	});

	// 连成字符串

	var parPairStrArr = [];
	for (var i in params)
	{
		var par = params[i];
		var parStr = par.join("=");
		parPairStrArr.push(parStr);
	}
	var str = parPairStrArr.join("&");
	return str;
}

function makeBaseUrl(host, hostPath)
{
	return host + hostPath;
}

// 声称签名
function makeSignature(reqMethod, host, hostPath, reqParams)
{
	var paramsStr = paramsToStr(reqParams);

	// 签名原文字符串
	var signStr = reqMethod + makeBaseUrl(host, hostPath) + "?" + paramsStr;

	// 签名
	var hs = CryptoJS.HmacSHA1(signStr, SecretKey);
	var rawSig = CryptoJS.enc.Base64.stringify(hs);
	console.log("rawSig=" + rawSig);
	var sig = encodeURIComponent(rawSig);
	return sig;
}

// 发送翻译请求
function sendTrans(sourceText, cb)
{
	if(sourceText == null || sourceText == "")
	{
		cb("");
		return;
	}

	SecretId = "XXXXXXXXXXXXXXXXXXXXXXXX";
	SecretKey = "XXXXXXXXXXXXXXXXXXXXXXXX";

	var reqMethod = "GET";
	var host = "tmt.tencentcloudapi.com";
	var hostPath = "/";

	var Nonce = Math.floor(Math.random() * 1000000000);
	var date = new Date();
	var timestamp = Math.floor(date.getTime() / 1000);

	//hostPath = "/v2/index.php";
	//Nonce = 9910;
	//timestamp = 1553493201;

	var reqParams = [
		[ "Action", "TextTranslate" ],
		[ "Nonce", Nonce ],
		[ "ProjectId", XXXXXXXX ],
		["Region", "ap-beijing"],
		["SecretId", SecretId],
		["Source","auto"],
		["SourceText", sourceText],  // 生成签名时，使用原文本
		["Target","zh"],
		["Timestamp",timestamp ],
		["Version","2018-03-21"]
	];

	// 生成签名
	var sig = makeSignature(reqMethod, host, hostPath, reqParams);

	// 原文本先按空格分隔成数段，对每段URI编码后，再用 + 号连接成一个字符串
	var srcTextArr = sourceText.split(" ");
	for(var i in srcTextArr)
	{
		srcTextArr[i] = encodeURIComponent(srcTextArr[i]);
	}
	var uriEncodedText = srcTextArr.join("+");
	var iSourceText = reqParams.findIndex((p)=>(p[0]=="SourceText"));
	reqParams[iSourceText][1] = uriEncodedText;
	var paramsStr = paramsToStr(reqParams);

	var url = "https://" + makeBaseUrl(host, hostPath) + "?" + paramsStr + "&Signature=" + sig;
	console.log("url=" + url);

	var xhr = new XMLHttpRequest();
	xhr.timeout = 3000;
	xhr.ontimeout = function()
	{
		cb("超时，翻译失败");
	};
	xhr.onerror = function(e)
	{
		cb("错误，翻译失败");
	};

	xhr.open(reqMethod, url, true);
	xhr.responseType = "json";
	var sendRet = xhr.send();
	xhr.onreadystatechange = function()
	{
		if(xhr.readyState == 4)
		{
			if(xhr.status == 200 || xhr.status == 304)
			{
				var ret = xhr.response;
				if(ret.Response.Error)
				{
					cb("Error: " + ret.Response.Error.Code + " - " + ret.Response.Error.Message);
				}
				else
				{
					cb(ret.Response.TargetText);
				}
			}
			else
			{
				cb("翻译失败");
			}
		}
	};

	// 
}

function sendMessageToContentScript(message, callback)
{
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
    {
        chrome.tabs.sendMessage(tabs[0].id, message, function(response)
        {
            if(callback) callback(response);
        });
    });
}

// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
	if(!request || !request.tweetId || !request.text)
	{
		return;
	}

	sendResponse("正在翻译...");

	sendTrans(request.text, function(res)
	{
		var transedObj =
		{
			tweetId: request.tweetId,
			text: res
		};

		sendMessageToContentScript(transedObj);
	});
});