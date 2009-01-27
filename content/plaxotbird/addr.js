
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
 
 
var gDisplayCardOrig = null;

window.addEventListener("load",     loadOverlay, false);
window.addEventListener("unload", unloadOverlay, false);

function include(pathName)
{
        var gScriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                              .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (gScriptLoader)
        {
            gScriptLoader.loadSubScript(pathName);
        }
}

function loadOverlay()
{
    include('chrome://plaxotbird/content/debug.js');
    PlxLogSysInit('addr');
    
    if (!gDisplayCardOrig)
    {
        gLog.info("hooking cardView");
        //alert(DisplayCardViewPane);
        gDisplayCardOrig = DisplayCardViewPane;
        DisplayCardViewPane = myDisplayCardPane;
        //alert("hooked");
    }
}

function unloadOverlay()
{
    gLog.info("********* In Unload Addr Overlay");
}



function HandleClick(what)
{
    try 
    {
        gLog.info('doing notify Observers');
        Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService)
            .notifyObservers(null, "PlxMainObserver", what);
    }
    catch (e)
    {
        gLog.error("Addr failed to notify observers of: " + what);
    }
      
}

    
var gPlxPrefsMgr;
var gPlxUserMgr;
var gPlxHttpMgr;

function HandleRUClick(email, fullname, isMember)
{
    try 
    {
        var url = "popup_send?t=po3&email=" + encodeURIComponent(email) + "&request=1&name=" + encodeURIComponent(fullname) + "&isMember="+ isMember + "&send_state=1&bizcard=1";
        
        gLog.info("URL:" + url);
        gPlxHttpMgr.DisplayURL3("", url, "");
    }
    catch (e)
    {
        gLog.error("exception: " + e);
    }
}


function plxSetNode(node, text, flex)
{
    if ( node )
    {
         if ( !node.hasChildNodes() )
         {
                 var textNode = document.createTextNode(text);
                 if (flex != undefined)
                    node.setAttribute("flex", flex);
                 node.appendChild(textNode);                                     
         }
         else if ( node.childNodes.length == 1 )
                 node.childNodes[0].nodeValue = text;    
    }
}

function plxCreateImageNode(doc, nodeId)
{
        var hb = doc.createElement('hbox');
        hb.setAttribute("flex", "1");
        hb.setAttribute("align", "center");
        hb.setAttribute("pack", "center");
        hb.setAttribute("width", "120");
        
        var sp = doc.createElement('spacer');
        sp.setAttribute("flex", "1");
        hb.appendChild(sp);
        
        var vb = doc.createElement('vbox');
        vb.setAttribute("flex", "1");
        vb.setAttribute("align", "center");
        vb.setAttribute("pack", "center");
        vb.setAttribute("height", "120");
        hb.appendChild(vb);

        var sp = doc.createElement('spacer');
        sp.setAttribute("flex", "1");
        hb.appendChild(sp);


        // DRU - for some reason, unknown to me, this image cannot be rendered
        // correctly unless I put spacers all around. Otherwise, it just gets
        // stretched??

        var sp2 = doc.createElement('spacer');
        sp2.setAttribute("flex", "1");
        vb.appendChild(sp2);
        
        var node = doc.createElement('image');
        node.id = nodeId;
        node.setAttribute("flex", "0");
        node.setAttribute("src", "");
        vb.appendChild(node);

        var sp2 = doc.createElement('spacer');
        sp2.setAttribute("flex", "1");
        vb.appendChild(sp2);
                
        return hb;
}
function myDisplayCardPane(card)
{
    if (gDisplayCardOrig)
        gDisplayCardOrig(card);
    
    var mdbCard=card.QueryInterface( Components.interfaces.nsIAbMDBCard );
    
    if (!mdbCard)
    {
        gLog.error("myDisplayCardPane - no mdbCard");
        return;
    }
        
              
    var state = mdbCard.getStringAttribute('PlxState');
    var workPhoto = mdbCard.getStringAttribute('PlxBusinessPhoto');
    
    var workBlog = mdbCard.getStringAttribute('PlxBusinessMicroBlog');
    workBlog = workBlog == null ? '<none>' : workBlog;

    var homeBlog = mdbCard.getStringAttribute('PlxPersonalMicroBlog');
    homeBlog = homeBlog == null ? '<none>' : homeBlog;
    
    var doc = document;
    var cvbContact = doc.getElementById("cvbContact");
    var vbox = cvbContact.parentNode;
    var tmp = doc.getElementById('plxBox');
    
    if (!tmp)
    {
    
        include('chrome://plaxotbird/content/prefs.js');
        include('chrome://plaxotbird/content/user.js');
        include('chrome://plaxotbird/content/http.js');
        
        gPlxHttpMgr  = new PlxHttpMgr();
        gPlxPrefsMgr = new PlxPrefsMgr();
        gPlxUserMgr  = new PlxUserMgr();
    
        var newGroup = doc.createElement("vbox")
        newGroup.id = 'plxBox';
        newGroup.className = 'cardViewGroup';
        //newGroup.setAttribute("debug", "true");
        vbox.appendChild(newGroup);
        
        tmp = newGroup;
      
        var hbox = doc.createElement('hbox');
        hbox.setAttribute("flex", "1");
        newGroup.appendChild(hbox);
        
        var node = doc.createElement('image');
        node.id = 'plxLogoImg';
        node.setAttribute("width", "100");
        node.setAttribute("height", "40");
        node.setAttribute("flex", "0");
        node.setAttribute("src", "chrome://plaxotbird/content/plaxo-logo2.png");
        hbox.appendChild(node);
       
        var node = doc.createElement('description');
        node.className = 'CardViewHeading';
        //heading.setAttribute("debug", "true");
        node.setAttribute("flex", "0");
        plxSetNode(node, " Enhanced Contact Information", "1");
        hbox.appendChild(node);
        
        //var node = doc.createElement('label');
        //node.setAttribute("debug", "true");
        //newGroup.appendChild(node);
        
        //var node = doc.createElement('description');
        //node.className = 'CardViewText';
        //node.value = 

        var hbox = doc.createElement('hbox');
        newGroup.appendChild(hbox);
        
        
        // databox
        var dataBox = doc.createElement('vbox');
        dataBox.setAttribute("flex", "1");
        hbox.appendChild(dataBox);
        

        var node = doc.createElement('spacer');
        node.setAttribute("flex", "0");
        node.setAttribute("height", "10");
        dataBox.appendChild(node);
        
        // Status row
        var rowBox = doc.createElement('hbox');
        dataBox.appendChild(rowBox);
        
        var node = doc.createElement('spacer');
        node.setAttribute("flex", "0");
        node.setAttribute("width", "10");
        dataBox.appendChild(node);
        
        var node = doc.createElement('image');
        node.id = 'plxImg';
        //node.setAttribute("width", "32");
        //node.setAttribute("height", "32");
        node.setAttribute("flex", "0");
        //node.setAttribute("maxwidth", "16");
        //node.setAttribute("maxheight", "16");
        rowBox.appendChild(node);
        
        var node = doc.createElement('description');
        //node.className  = 'CardViewText';
        node.id = 'plxSendState';
        node.setAttribute("flex", "1");
        //node.setAttribute("debug", "true");
        //node.removeAttribute("collapsed");
        plxSetNode(node, "");
        rowBox.appendChild(node);
        
        /*
        var node = doc.createElement('description');
        node.className  = 'CardViewText';
        node.value = "state: ";
        node.id = 'plxSendState';
        //node.setAttribute("debug", "true");
        //node.removeAttribute("collapsed");
        plxSetNode(node, node.value);
        dataBox.appendChild(node);
        */

        var node = doc.createElement('spacer');
        node.setAttribute("flex", "0");
        node.setAttribute("height", "10");
        dataBox.appendChild(node);
        
        // Work microblog
        var node = doc.createElement('description');
        //node.className  = 'CardViewText';
        node.value = "Work Microblog: " + workBlog;
        node.id = 'plxWorkMicroBlog';
        //node.setAttribute("debug", "true");
        //node.removeAttribute("collapsed");
        plxSetNode(node, node.value);
        dataBox.appendChild(node);

        var node = doc.createElement('spacer');
        node.setAttribute("flex", "0");
        node.setAttribute("height", "10");
        dataBox.appendChild(node);
        
        // Home microblog
        var node = doc.createElement('description');
        //node.className  = 'CardViewText';
        node.value = "Home Microblog: " + homeBlog;
        node.id = 'plxHomeMicroBlog';
        //node.setAttribute("debug", "true");
        //node.removeAttribute("collapsed");
        plxSetNode(node, node.value);
        dataBox.appendChild(node);

        var node = doc.createElement('spacer');
        node.setAttribute("flex", "0");
        node.setAttribute("height", "10");
        dataBox.appendChild(node);
        

        // spacer
        var node = doc.createElement('spacer');
        node.setAttribute("flex", "0");
        node.setAttribute("width", "12");
        hbox.appendChild(node);

        // picbox
        var picBox = doc.createElement('vbox');
        picBox.setAttribute("width", "150");
        picBox.setAttribute("align", "center");
        picBox.setAttribute("pack", "center");
        //picBox.setAttribute("debug", "true");
        hbox.appendChild(picBox);


        var node = plxCreateImageNode(doc, 'plxWorkPhoto');
        picBox.appendChild(node);

        var node = doc.createElement('spacer');
        node.setAttribute("flex", "0");
        node.setAttribute("height", "10");
        picBox.appendChild(node);
        
        var node = doc.createElement('button');
        node.id = 'plxRequestUpdate';
        node.setAttribute("label", "Request Update...");
        node.setAttribute("disabled", "true");
        picBox.appendChild(node);
        gLog.debug("Setting up button");

        /* No link for now
        var node = doc.createElement('button');
        node.id = 'plxOnline';
        node.setAttribute("label", "Online Version...");
        picBox.appendChild(node);
        */
    }


    // FILL THE CONTENT
    tmp.removeAttribute("collapsed");
    
    var node = doc.getElementById('plxLogoImg');
    if (gPlxUserMgr.isComcastUser())
      node.setAttribute('hidden', 'true');
    
    var stateMsg = "Synchronized with Plaxo online";
    var node = doc.getElementById('plxImg');
    
    node.setAttribute("src", "");
    if (state == "member")
    {
        node.setAttribute("src", "chrome://plaxotbird/content/state_member.png");
        stateMsg = "Plaxo member (Always up-to-date)";
    }
    else if (state == "sent")
    {
        node.setAttribute("src", "chrome://plaxotbird/content/state_sent.png");
        stateMsg = "Request sent";
    }
    else if (state == "replied")
    {
        node.setAttribute("src", "chrome://plaxotbird/content/state_replied.png");
        stateMsg = "User replied";
    }
    else if (state == "sending")
    {
        node.setAttribute("src", "chrome://plaxotbird/content/state_sent.png");
        stateMsg = "Request being sent";
    }
    else if (state == "bounced")
    {
        node.setAttribute("src", "chrome://plaxotbird/content/state_bounce.png");
        stateMsg = "Request to user bounced. (Check Plaxo Online)";
    }
    else if (state == "unknown" || state == "none")
    {
        node.setAttribute("src", "");
        stateMsg = "Synced with Plaxo online";
    }
    //node.setAttribute("flex", "0");
    //node.removeAttribute("collapsed");
    
    var node = doc.getElementById('plxSendState');
    node.value = stateMsg;
    //node.removeAttribute("collapsed");
    plxSetNode(node, node.value);


    var node = doc.getElementById('plxWorkPhoto');
    if (node)
    {
        node.setAttribute("src", "");
        if (workPhoto)
        {
            node.setAttribute("src", "http://" + workPhoto + "&size=100");
            //node.setAttribute("flex", "0");
        }
        //node.removeAttribute("collapsed");
    }

    var node = doc.getElementById('plxWorkMicroBlog');
    node.value = "Work Microblog: " + workBlog;
    //node.removeAttribute("collapsed");
    plxSetNode(node, node.value);
    
    var node = doc.getElementById('plxHomeMicroBlog');
    node.value = "Home Microblog: " + homeBlog;
    //node.removeAttribute("collapsed");
    plxSetNode(node, node.value);
    
    var node = doc.getElementById('plxRequestUpdate');
            
    if (gPlxUserMgr.getPrivacyFlag())
      node.setAttribute('hidden', 'true');
    else
    {
      //node.disabled = "false";
      if (card.primaryEmail == '')
      {
          node.setAttribute("disabled", "true");
      }
      else
      {
          node.removeAttribute("disabled");
          if (state == "member")
            node.setAttribute("oncommand", "HandleRUClick('" + card.primaryEmail + "','', '1')" );
          else 
            node.setAttribute("oncommand", "HandleRUClick('" + card.primaryEmail + "','', '0')" );
      }
      gLog.info('primaryEmail: ' + card.primaryEmail);
    }
}

