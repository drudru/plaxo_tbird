
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


PlxLogSysInit('sync.syncprogress');

var timerID;
var isTest = 0;

function onCancel()
{
    if (isTest > 0)
        return true;

    gLog.error("doing cancel");
    clearTimeout(timerID);
    var bag = window.arguments[0];
    bag.isGood = false;
    return true;
}

function onLoad()
{
    
    if (window.arguments[0] == undefined)
    {
        isTest = 1;
        var cancelButton = document.getElementById('prog-cancel');
        //cancelButton.setAttribute('hidden', 'true')
        timerID = setTimeout("Test()", 250);
        return;
    }
    
    var bag = window.arguments[0];
    
    bag.currentIdx = 0;
    
    var title = document.getElementById("title");
    title.value = bag.title;

    gLog.log(bag.title + ": handling cmds length: " + bag.cmds.length);
    
    var cancelButton = document.getElementById('prog-cancel');
    if (bag.cancel == false)
        cancelButton.setAttribute('hidden', 'true');
    else
        cancelButton.setAttribute('hidden', 'false');
        
    
   
    // Start the channel
    timerID = setTimeout(HandleCmds, 1);
}

function HandleCmds()
{
    var bag = window.arguments[0];
    
    var idx      = bag.currentIdx;
    var cmds     = bag.cmds;
    var obj      = bag.obj;
    var arg1     = bag.arg1;
    
    var progress = document.getElementById("meter");
    progress.setAttribute("value", (idx / cmds.length * 100).toFixed());

    var label = document.getElementById("current");
    label.value = "Processing " + (idx + 1) + " of " + cmds.length + " records...";
    
    if (idx == cmds.length)
    {
        gLog.debug(bag.title + ": doing acceptDialog");
        bag.isGood = true;
        document.documentElement.acceptDialog();
        return;
    }

    
    obj[bag.funcName](cmds[idx], arg1);

    bag.currentIdx = bag.currentIdx + 1;
    timerID = setTimeout(HandleCmds, 0);
}

function Test()
{
    var progress = document.getElementById("meter");
    progress.setAttribute("value", isTest);

    var label = document.getElementById("current");
    label.value = "Testing " + isTest + " of 100 records...";
    
    if (isTest == 100)
    {
        document.documentElement.acceptDialog();
        return;
    }

    isTest++;
    timerID = setTimeout("Test()", 250);
}

