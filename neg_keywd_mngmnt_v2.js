function run(sIncludedCampaignsIdentifier,aExcludedCampaigns,aExcludedAdgroups) {
  initLabels();

  var campaignItterator = getAllButExcludedCampaigns(sIncludedCampaignsIdentifier, aExcludedCampaigns);
  
  var oKeywords = {};
  var adGroup;
  var keywords;
  var campaign;
  var adGroupItterator;
  Logger.log('reading')
  while(campaignItterator.hasNext()){
    campaign = campaignItterator.next();
    oKeywords[campaign.getName()] = {};
    Logger.log('    ' + campaign.getName());

    adGroupItterator = getAdgroups(campaign,aExcludedAdgroups);
    while(adGroupItterator.hasNext()){
      adGroup  = adGroupItterator.next();
      keywords = mergeArrays([],getKeywords(adGroup));
      //keywords = mergeArrays(keywords,getNegativeKeywords(adGroup));

      oKeywords[campaign.getName()][adGroup.getName()] = keywords;
    }
  }

  var campaignsRead = Object.keys(oKeywords);
  var adGroupsRead;

  Logger.log('Writing');
  campaignItterator = getAllButExcludedCampaigns(sIncludedCampaignsIdentifier, aExcludedCampaigns);
  while(campaignItterator.hasNext()){
    checkScriptQuotas(300,25000,25000);
    campaign = campaignItterator.next();
    Logger.log('    ' + campaign.getName());
    if(checkLabel(campaign)){continue;};

    adGroupsRead = Object.keys(oKeywords[campaign.getName()]);

    for(var i=0;i<campaignsRead.length;++i){

      if(campaignsRead[i] != campaign.getName()){
        createNegativeKeywords(campaign,mergeObjectToArray(oKeywords[campaignsRead[i]]));
        continue;
      }

      adGroupItterator = getAdgroups(campaign,aExcludedAdgroups);
      while(adGroupItterator.hasNext()){
        adGroup = adGroupItterator.next();
        keywords = [];
        for(var j=0;j<adGroupsRead.length;++j){
          if(adGroupsRead[j] == adGroup.getName()){continue;}
          keywords = mergeArrays(keywords,oKeywords[campaign.getName()][adGroupsRead[j]]);
          
        }
        
        createNegativeKeywords(adGroup,keywords);

      }
    }
    campaign.applyLabel("NegKeyMngmt: Done");
  }
}


function initLabels(){
  var date = new Date;
  var label = AdWordsApp.labels()
    .withCondition("Name = 'NegKeyMngmt: Done'")
    .get();
  
  if(!label.hasNext()){
    AdWordsApp.createLabel("NegKeyMngmt: Done");
  }
  else{
    if(date.getDay() == iRefreshDay){
      label.next().remove();
      AdWordsApp.createLabel("NegKeyMngmt: Done");
    }
  }

  return true;
}

function checkLabel(campaign){
  var label = campaign.labels()
    .withCondition("Name = 'NegKeyMngmt'")
    .get();
  if(label.hasNext())
    return true;
  return false;
}



function getAllButExcludedCampaigns(sIncluded, aExcluded) {
  var campaignSelector = AdWordsApp
     .campaigns();
  if(sIncluded.length > 0){
    campaignSelector.withCondition('Name CONTAINS_IGNORE_CASE "'+sIncluded+'"')
  }
  for(var i=0;i<aExcluded.length;++i){
    campaignSelector.withCondition('Name DOES_NOT_CONTAIN_IGNORE_CASE "'+aExcluded[i]+'"');
  }
  var campaignIterator = campaignSelector.get();
  return campaignIterator;
}

function getAdgroups(campaign,aExcluded){
  var adGroupSelector = campaign
    .adGroups();

  for(var i=0;i<aExcluded.length;++i){
    adGroupSelector.withCondition('Name DOES_NOT_CONTAIN_IGNORE_CASE "'+aExcluded[i]+'"');
  }  

  var adGroupIterator = adGroupSelector.get();
  return adGroupIterator;
}

function getKeywords(adGroup) {
  var lKeywords = [];
  var keyWordsItterator = adGroup.keywords().get();
  while(keyWordsItterator.hasNext()){
    var keyword = keyWordsItterator.next().getText();
    lKeywords.push(keyword);
  }
  return lKeywords;
}


function getNegativeKeywords(adGroup) {
  var lKeywords = [];
  var negativeKeywordIterator = adGroup.negativeKeywords().get();
  while (negativeKeywordIterator.hasNext()) {
    var negkeyword = negativeKeywordIterator.next().getText();
    lKeywords.push(negkeyword);
  }
  return lKeywords;
}

function createNegativeKeywords(oOpperant,lKeywords){  

    
    for(var i=0;i<lKeywords.length;++i){
      var sKeywordExact = convertToExact(lKeywords[i]);
      oOpperant.createNegativeKeyword(sKeywordExact); 
    }
   

  return oOpperant;
}
    

function convertToExact(sKeyword){
  var sConvKeyWord = "";
  sConvKeyword = sKeyword.replace(/\+/g,"").replace("[","").replace("]","").replace(/\"/g,"");
  return "["+sConvKeyword+"]";
}

function mergeArrays(array1,array2){
  for(var i=0;i<array2.length;++i){
     array1.push(array2[i]);
  }
  return array1;
}

function mergeObjectToArray(object){
  var list = [];
  for(var key in object){
    if(object.hasOwnProperty(key))
      list = mergeArrays(list,object[key]);
  }
  return list;
}

function objectRemKey(obj, key){
  if(obj.hasOwnProperty(key)){
    delete obj[key];
  }else{
    return false;
  }
}

Object.keys = function(obj){
  keys = [];
  for (var key in obj){
    if(obj.hasOwnProperty(key)) 
      keys.push(key);
  }
  return keys;
}

function checkScriptQuotas(iTimeQuota,iCreateQuota,iGetQuota){
    /*
    Checks the status of the script with respect to the parameter quotas

    Parameters:
      @iTimeQuota   : How much time should be remaining to return true;
      @iCreateQuota   : How much create should be remaining to return true;
      @iGetQuota    : How much get should be remaining to return true;

    Returns:
      true:   if all quota's are met
      false:  else;

    */
    var intRemTime = AdWordsApp.getExecutionInfo().getRemainingTime();
    var intRemCreate = AdWordsApp.getExecutionInfo()
      .getRemainingCreateQuota();
    var intRemGet = AdWordsApp.getExecutionInfo().getRemainingGetQuota();

    if(intRemTime < iTimeQuota || intRemCreate < iCreateQuota || 
        intRemGet < iGetQuota)
      throw 'Quota Reached, see you next hour';
    
    return true;
  }

var aExcludedAdgroups = typeof aExcludedAdgroups == 'undefined' ? [] : aExcludedAdgroups;
var aExcludedCampaigns = typeof aExcludedCampaigns == 'undefined' ? [] : aExcludedCampaigns;
var aExcludedAdgroups = typeof sIncludedCampaignsIdentifier == 'undefined' ? "" : sIncludedCampaignsIdentifier;

run(aExcludedAdgroups,aExcludedCampaigns,aExcludedAdgroups);