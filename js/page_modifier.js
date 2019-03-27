// 推文流
const TWEET_STREAM_CLASS_NAME = "stream-items js-navigable-stream";

// 推文条目
const TWEET_ENTRY_CLASS_NAME = "js-stream-item stream-item stream-item";
// 推文文本
const TWEET_TEXT_CLASS_NAME = "TweetTextSize  js-tweet-text tweet-text";

// 原翻译按钮
const ORIGINAL_TRANS_BUTTON_CLASS_NAME = "btn-link js-translate-tweet translate-button u-textUserColorHover";
// 原未翻译图层
const ORIGINAL_TRANS_DIV_CLASS_NAME = "tweet-translation needs-translation";
// 原已翻译图层
const ORIGINAL_TRANS_DONE_DIV_CLASS_NAME = "tweet-translation";
// 原翻译文本
const ORIGINAL_TRANS_TEXT_CLASS_NAME = "tweet-translation-text";

// 打开的推文体（可以理解为打开的推文的root）
const OPENED_TWEET_BODY_CLASS_NAME = "PermalinkOverlay-body";
// 打开的推文条目
const OPENED_TWEET_ENTRY_CLASS_NAME = "permalink-inner permalink-tweet-container";
// 打开的推文文本
const OPENED_TWEET_TEXT_CLASS_NAME = "TweetTextSize TweetTextSize--jumbo js-tweet-text tweet-text";
// 打开的推文的评论流
const OPENED_TWEET_COMMENT_STREAM_CLASS_NAME = "stream-items";
// 评论里的会话流
const OPENED_TWEET_COMMENT_CONVERSATION_CLASS_NAME = "ThreadedConversation";

// 腾讯翻译按钮的className，主要用来区分
const TENCENT_TRANS_BUTTON_CLASS_NAME = "tencent-trans-btn";
const TENCENT_TRANS_DIV_CLASS_NAME = "tencent-trans-div";

var currentURL;

// 打开的推文条目没有id，为了方便起见，下面是生成唯一id的机制
const FIXED_ID_PREFIX = "TENCENT_TRANS_FIXED_ID_";
var nextFixedId = 1;
function getFixedId()
{
	var id = FIXED_ID_PREFIX + nextFixedId;
	nextFixedId++;
	return id;
}

// 根据 tweetId 获取推文条目（每个推文一个条目）
function getEntryByTweetId(id)
{
	var entry = document.getElementById(id);
	return entry;
}

// 获取推文的文本元素
function getTweetTextElement(entry)
{
	var list = entry.getElementsByClassName(TWEET_TEXT_CLASS_NAME);
	if(!list || list.length == 0)
	{
		list = entry.getElementsByClassName(OPENED_TWEET_TEXT_CLASS_NAME);
	}
	return list[0];
}

// 从条目中获取原翻译按钮
function getOriginalTransButton(entry)
{
	var list = entry.getElementsByClassName(ORIGINAL_TRANS_BUTTON_CLASS_NAME);
	if(!list) return null;
	return list[0];
}

// 从条目中获取原翻译层
function getOriginalTransDiv(entry)
{
	var list = entry.getElementsByClassName(ORIGINAL_TRANS_DIV_CLASS_NAME);
	if(!list || list.length == 0)
	{
		list = entry.getElementsByClassName(ORIGINAL_TRANS_DONE_DIV_CLASS_NAME);
	}

	if(!list) return null;
	return list[0];
}

// 从条目中获取原翻译文本的元素
function getOriginalTransTextElement(entry)
{
	var list = entry.getElementsByClassName(ORIGINAL_TRANS_TEXT_CLASS_NAME);
	if(!list) return null;
	return list[0];
}

// 从条目中获取腾讯翻译按钮
function getTencentTransBtn(entry)
{
	var list = entry.getElementsByClassName(TENCENT_TRANS_BUTTON_CLASS_NAME);
	if(!list) return null;
	return list[0];
}

// 添加腾讯翻译按钮到条目
function addTencentTransButtonToEntry(entry)
{
	if(!entry) return;

	var sourceTextElement = getTweetTextElement(entry);
	var originalBtn = getOriginalTransButton(entry);

	if(!sourceTextElement || !originalBtn)
	{
		return;
	}

	if(!sourceTextElement.lang || sourceTextElement.lang.indexOf("zh") != 0)  // 中文推文不添加翻译按钮
	{
		var btn = getTencentTransBtn(entry);
		if(!btn)
		{
			btn = document.createElement("button");
			btn.type = "button";
			btn.className = TENCENT_TRANS_BUTTON_CLASS_NAME;
			btn.innerText = "腾讯翻译";
			// 打开的推文条目没有id，为方便起见（收到翻译结果时，快速找到原文），为它生成一个唯一的id
			if(!entry.id || entry.id == "")
			{
				entry.id = getFixedId();
			}
			btn.tweetId = entry.id;
			// 把腾讯翻译按钮添加到原翻译按钮的前面
			originalBtn.parentElement.insertBefore(btn, originalBtn);

			// 点击腾讯翻译按钮的处理函数
			btn.onclick = function()
			{
				// 根据id获取推文条目
				var entry = getEntryByTweetId(this.tweetId);
				if(!entry) return;

				// 从条目中获取推文的文本
				var sourceTextElement = getTweetTextElement(entry);

				// 向 background 脚本发送消息，由 background 脚本向腾讯翻译 api 发起请求
				chrome.runtime.sendMessage(
				{
					tweetId: this.tweetId,
					text: sourceTextElement.innerText
				});
			};
		}
	}
}

// 添加腾讯翻译按钮给整个推文流中的所有推文条目
function addTencentTransButtonsToStream(root)
{
	var entryList = root.getElementsByClassName(TWEET_ENTRY_CLASS_NAME);
	if(!entryList) return;

	for(var i = 0; i < entryList.length; ++i)
	{
		var entry = entryList[i];
		addTencentTransButtonToEntry(entry);
	}
}

// 文档刚加载完毕时添加一遍腾讯翻译按钮，以后要监听页面改变，有新的推文条目时还要再次添加
document.addEventListener('DOMContentLoaded', function()
{
	currentURL = document.URL;
	addTencentTransButtonsToStream(document);
});

// 监听页面变化
var obs = new MutationObserver(function(mutations)
{
	mutations.forEach(function(mutation)
	{
		if(mutation.type == "childList")
		{
			if(mutation.target.className == TWEET_STREAM_CLASS_NAME  // 推文流有子结点添加
				|| mutation.target.className == OPENED_TWEET_COMMENT_STREAM_CLASS_NAME)  // 打开的推文的评论流有子结点添加
			{
				// 对添加的每个子结点，如果是推文条目，则添加腾讯翻译按钮
				mutation.addedNodes.forEach(function(node)
				{
					if(node.className)
					{
						if(node.className.indexOf(TWEET_ENTRY_CLASS_NAME) == 0)
						{
							addTencentTransButtonToEntry(node);
						}
						else if(node.className.indexOf(OPENED_TWEET_COMMENT_CONVERSATION_CLASS_NAME) == 0)
						{
							addTencentTransButtonsToStream(node);
						}
					}
				});
			}
			else if(mutation.target.className == OPENED_TWEET_BODY_CLASS_NAME)
			{
				// 打开了某个推文

				// 找出打开的推文条目（与主页上的不太一样，在此其实是一个更高层的父级控件）
				var openedTweetEntry = mutation.target.getElementsByClassName(OPENED_TWEET_ENTRY_CLASS_NAME)[0];
				if(openedTweetEntry)
				{
					addTencentTransButtonToEntry(openedTweetEntry);
				}

				// 找出打开的推文的评论流
				var openedTweetCommentStream = mutation.target.getElementsByClassName(OPENED_TWEET_COMMENT_STREAM_CLASS_NAME)[0];
				if(openedTweetCommentStream)
				{
					addTencentTransButtonsToStream(openedTweetCommentStream);
				}
			}
		}

		// 解决在推特上点击别人，跳转到对方主页后，没有添加腾讯翻译按钮的问题
		if(currentURL != document.URL)
		{
			currentURL = document.URL;

			if(currentURL && currentURL.indexOf("/status/") == -1)
			{
				addTencentTransButtonsToStream(document);
			}
		}
	});
});
obs.observe(document.documentElement,  // 监听整个页面
{
	"subtree": true,  // 包括子树
	"childList": true  // 子结点添加或删除
});

// 从 background.js 接收翻译结果
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
	if(!request || !request.tweetId || !request.text)
	{
		return;
	}

	// 根据id获取推文条目
	var entry = getEntryByTweetId(request.tweetId);
	if(!entry) return;

	// 获取腾讯翻译图层
	var transDiv = entry.getElementsByClassName(TENCENT_TRANS_DIV_CLASS_NAME)[0];
	if(!transDiv)
	{
		// 从条目获取原翻译图层
		var originalTransDiv = getOriginalTransDiv(entry);
		if(!originalTransDiv) return;

		// 从原翻译图层复制一份
		transDiv = originalTransDiv.cloneNode(true);
		transDiv.className = TENCENT_TRANS_DIV_CLASS_NAME;
		transDiv.style.visibility = "visible";

		// 把 logo 图片改成腾讯翻译的logo
		var logo = transDiv.getElementsByClassName("attribution-logo")[0];
		if(logo)
		{
			var a = document.createElement("a");
			a.href = "https://fanyi.qq.com";
			a.target = "_blank";
			a.innerText = "腾讯";
			logo.parentElement.replaceChild(a, logo);
		}

		originalTransDiv.parentElement.appendChild(transDiv);
	}

	var transText = transDiv.getElementsByClassName(ORIGINAL_TRANS_TEXT_CLASS_NAME)[0];
	if(!transText) return;

	transText.innerText = request.text;
});