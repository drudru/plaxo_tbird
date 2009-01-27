
/****** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public
 * License Version 1.1 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of
 * the License at http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS
 * IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * rights and limitations under the License.
 * 
 * The Original Code is mozilla.org code.
 * 
 * The Initial Developer of the Original Code is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1999 Netscape Communications Corporation.  All
 * Rights Reserved.
 * 
 * Contributor(s): Dru Nelson            <plaxo.com>
 *
 * ***** END LICENSE BLOCK ***** */
 
function include(pathName)
{
        var gScriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                              .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (gScriptLoader)
        {
            gScriptLoader.loadSubScript(pathName);
        }
}

include('chrome://plaxotbird/content/debug.js');
PlxLogSysInit('icui');
include('chrome://plaxotbird/content/version.js');
PlxDumpVersion();

var gPlxPrefsMgr;
var gPlxUserMgr;
var gPlxHttpMgr;

window.addEventListener("load",     loadOverlay, false);
window.addEventListener("unload", unloadOverlay, false);


function loadOverlay()
{
    gLog.debug("ICUI - in load overlay");
}

function unloadOverlay()
{
    gLog.debug("ICUI - in unload overlay");
}


addEventListener('messagepane-loaded', plxICUIOnLoad, true);
addEventListener('messagepane-unloaded', plxICUIOnUnload, true);
addEventListener('messagepane-hide', plxICUIOnMessagePaneHide, true);
addEventListener('messagepane-unhide', plxICUIOnMessagePaneUnhide, true);


function HandleICUIClick(buttonID)
{
/*
    var myBag = {};
    myBag.isGood = false;
    myBag.email = gPlxCurrentSender;
    myBag.fullName = '';
    var w = window.openDialog("chrome://plaxotbird/content/contact-send.xul",
                    "stuff",
                    "chrome,modal,width=400,height=300", myBag);
    
    if (!myBag.isGood)
    {
        alert('not good');
        return;
    }
    else
        alert('good');
        
*/
        

    include('chrome://plaxotbird/content/http.js');
    include('chrome://plaxotbird/content/user.js');
    include('chrome://plaxotbird/content/prefs.js');


    gPlxUserMgr = new PlxUserMgr();
    gPlxHttpMgr = new PlxHttpMgr();
    
    var url = "popup_send?t=po3&email=" + encodeURIComponent(gPlxCurrentSender) + "&request=1&name=" + encodeURIComponent(gPlxCurrentSenderFN) + "&send_state=1&bizcard=1";
    
    gLog.debug("URL:" + url);
    gPlxHttpMgr.DisplayURL3("", url, "");
    
    return 0;

/*
    myBag.outVars = ['action', 'ContactSend', 'v', '1',
                    'email', myBag.email, 'fullname', myBag.fullName,
                    'sendType', (myBag.requestUpdate ? 'UpdateRequest' : 'SendInfo'),
                    'sendBizCard', (myBag.sendBizCard ? '1' : '0'),
                    'sendPersonalCard', (myBag.sendPersonalCard ? '1' : '0'),
                    'addtoFolder', (myBag.addToBook ? '1' : '0'),
                    'personalMessage', myBag.personalMessage
                    ];
    
    myBag.reason = "Doing single contact request...";
    
    // DRU NEED USER MANAGER INITTED FOR THIS THREAD OR PASSED IN??
    var ret = restPOSTCall(myBag);

    alert('ret: ' + ret);
    if (!ret)
        return 0;
        
    alert('wentFine');
*/
}


var gPlxICUIBox = null;
var gPlxICUIButton = null;
var gPlxCurrentSender;
var gPlxCurrentSenderFN = '';
var gPlxdone = 0;

function onPlxICUIStartHeaders()
{    

    // EVIL LURKS HERE - Why this is only available here is a medium-term mystery


    gLog.debug("onPlxICUIStartHeaders");
    // Get the current message email address
    //gPlxICUIButton.setAttribute("label", "XUYConnect");
    gPlxICUIButton.label = ' Connect ';
    //gPlxICUIButton.setAttribute("image", "chrome://plaxotbird/content/plaxo.png");
    //gPlxICUIButton.image = "chrome://plaxotbird/content/plaxo.png";
    ////alert(currentHeaderData['to'].headerValue);
    //gLog.debug('onStartHeaders\n-------------------');
    
    
    // THIS IS SO DAMN TRICKY !!! DN 6/27/2005
    var fromButton = document.getElementById("expandedfromBox");
    fromButton.addEventListener('DOMAttrModified', plxICUIOnChange, true);

    plxICUISetButton();
}


function plxLocateContact3(email)
{
    var abURI = "moz-abmdbdirectory://" + "abook.mab";
    var rdf=Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var directory = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);
    var childE=directory.childCards;
    
    var card = undefined;
    gLog.debug("locateContact2: " + email);
    
    try {
        childE.first();
        var card;
        var found = false;
        while( 1 ) {
            card=childE.currentItem().QueryInterface( Components.interfaces.nsIAbCard );
            
            //gLog.debug('primaryEmail: ' + card.primaryEmail);
            if (card.primaryEmail == email)
                found = true;
                
            if (found)        
            {
                gLog.debug("foundCard");
                //card = card.QueryInterface( Components.interfaces.nsIAbCard );
                return card;
            }
            childE.next();
        }
    } catch( ex ) {
        //gLog.info("Stupid Mozilla XPCOM/JS/ENUM Exception");
    }
    
    return undefined;
}

function plxLocateContact2(email)
{
    // Yikes - hard coded!
    // XXX Hard Coded
    var abURI = "moz-abmdbdirectory://" + "abook.mab";
    var rdf=Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var directory = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);
    //var childE=directory.childCards;
    
    var addressBook = Components.classes[ "@mozilla.org/addressbook;1" ].createInstance();
    addressBook = addressBook.QueryInterface( Components.interfaces.nsIAddressBook );
    
    db = addressBook.getAbDatabaseFromURI(abURI);
    
    var card = db.getCardFromAttribute(directory, "PrimaryEmail", email, false);    
    
    return card;
}

function plxDoubleCheck()
{
    gLog.debug("plxDoubleCheck label: " + gPlxICUIButton.label);
    if (gPlxICUIButton.label != ' Connect ')
        return;

    /*
    gLog.debug("plxDoubleCheck current: " + gPlxCurrentSender);
    
    var attrs = efb.attributes;
    
    for (var i = 0; i < attrs.length; i++)
    {
        gLog.debug("attr: " + attrs[i].name + ' -> ' + attrs[i].value);
    }
    
    var node = efb.getAttributeNode('emailAddress');
    gLog.debug("plxDoubleCheck current: " + node);
    //gLog.debug("plxDoubleCheck current: " + gPlxCurrentSender.toSource());
    */
    plxICUISetButton();
}

function plxICUISetButton()
{
    gLog.debug("plxICUISetButton");

    var show = gPlxPrefsMgr.getBoolPref("plaxo.plxShowICUI", true);
    if (!show)
    {
        gLog.debug("collapsing button");
        gPlxICUIBox.collapsed = true;
        return;
    }

    var hdrView = document.getElementById("expandedHeaderView");
    gLog.debug("hdrView collapsed: " + hdrView.collapsed.toSource());
    if (hdrView.collapsed == true)
    {
        gPlxICUIBox.collapsed = true;
        return;
    }

    gPlxICUIBox.collapsed = false;
    
    if (gPlxCurrentSender != '')
    {
        var abCard = plxLocateContact2(gPlxCurrentSender);
        var state = undefined;
        var workPhoto = undefined;
        
        if (abCard)
        {
            var mdbCard=abCard.QueryInterface( Components.interfaces.nsIAbMDBCard );
            
            if (!mdbCard)
                return;
        
            state = mdbCard.getStringAttribute('PlxState');
            workPhoto = mdbCard.getStringAttribute('PlxBusinessPhoto');
        }


        gPlxICUIButton.label = ' Connect to: ' + gPlxCurrentSender;
        
        var url = "chrome://plaxotbird/content/plaxo.png";  // default
        gLog.debug("workPhoto: " + workPhoto);
        if (workPhoto)
        {
            url = "http://" + workPhoto + "&size=50";
            gPlxICUIButton.image = url;
        }
        else
            gPlxICUIButton.image = "";
        
    }
    else
        gPlxICUIButton.label = ' Connect ';
    
    //gPlxICUIButton.setAttribute("image", "chrome://plaxotbird/content/plaxo.png");
    if (!gPlxdone)
    {
        //gPlxICUIButton.image = "chrome://plaxotbird/content/plaxo.png";
        gPlxdone = 1;
    }
}

function onPlxICUIEndHeaders()
{
    gLog.debug('onEndHeaders\n-------------------');
}

function plxICUIOnChange(event)
{
    gLog.debug('onChange\n-------------------');
    
    gLog.debug('id: ' + event.target.id + ' attr: ' + event.attrName + ' bubble: ' + event.eventPhase + ' -> ' + event.newValue);
    if (event.attrName == 'emailAddress')
    {
        gPlxCurrentSender = event.newValue; //currentHeaderData['from'].headerValue;
        gLog.debug('*** Setting sender to: ' + gPlxCurrentSender);
        gPlxCurrentSenderFN = '';
    //gPlxICUIButton.setAttribute("image", "chrome://plaxotbird/content/plaxo.png");
    //gPlxICUIButton.image = "chrome://plaxotbird/content/plaxo.png";
        plxICUISetButton();
    }
    if (event.attrName == 'displayName')
    {
        gPlxCurrentSenderFN = event.newValue;
    }
}


function plxICUIOnLoad(event)
{
    gPlxPrefsMgr = new PlxPrefsMgr();
    
    gLog.debug("plxICUIOnLoad");
    gPlxICUIBox = document.getElementById('plxICUIBox');
    gPlxICUIButton = document.getElementById('plxICUIButton');
    

    var msgHeader = document.getElementById('msgHeaderView');
    msgHeader.addEventListener('DOMAttrModified', plxHdrOnChange, true);
    
    // add ourself to the list of message display listeners so we get notified when we are about to display a
    // message.
    var listener = {};
    listener.onStartHeaders = onPlxICUIStartHeaders;
    listener.onEndHeaders = onPlxICUIEndHeaders;
    gMessageListeners.push(listener);
    
}
 
function plxICUIOnUnload(event)
{
    gLog.debug("plxICUIOnUnLoad");
    // Do nothing?
    return;
}
 
function plxICUIOnMessagePaneHide()
{
    gLog.debug("**Message pane hide*");
    // Set stuff to collapsed
    gPlxICUIBox.collapsed = true;
}
 
function plxICUIOnMessagePaneUnhide()
{
    gLog.debug("**Message pane unhide*");
    // Set stuff to un-collapsed if valid icui
    gPlxICUIBox.collapsed = false;
}


function plxHdrOnChange(event)
{
    
    if (event.target.id == 'expandedHeaderView' && event.attrName == 'collapsed')
    {
        gLog.debug('** ' + event.target.id + ' bubble: ' + event.eventPhase + ' newVal: ' + event.newValue + ' prevVal: ' + event.prevValue);
        if (event.newValue != "true")
        {
            gPlxICUIBox.collapsed = false;
            gLog.debug('hdr onChange: ' + event.attrName + ' false : ' + event.newValue.toSource() );
            
            plxDoubleCheck();
        }
        else
        {
            gPlxICUIBox.collapsed = true;        
            gLog.debug('hdr onChange: ' + event.attrName + ' true' + event.newValue.toSource() );
        }
    }

    gLog.debug(event.attrName + ' -> ' + event.newValue + ' src: ' + event.newValue.toSource() + ' prevVal: ' + event.prevValue);
}

