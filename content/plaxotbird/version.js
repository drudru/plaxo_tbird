
/****** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.109
 *
 * The contents of this file are subject to the Mozilla Public
 * License Version 1.109 (the "License"); you may not use this file
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
 
// THE FOLLOWING LINE IS MODIFIED BY THE BUILD SYSTEM
// DO NOT REMOVE OR EDIT IT  - THANKS!
var PlaxoVersion = "1.109";

function PlxDumpVersion()
{
    gLogSys.log('*****');
    gLogSys.log('***** ***** ' + "Plaxo Version: " + PlaxoVersion);
    gLogSys.log('***** ***** ' + "TBird Version: " + PlxGetAppNameVer());
    gLogSys.log('*****');
}


function PlxGetAppNameVer()
{
    var a = "SeaMonkey";
    
    // If this interface exists and is finally frozen...
    try
    {
        var nsIAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
        if (nsIAppInfo && nsIAppInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}")
        {
            a = "Thunderbird " + nsIAppInfo.version;
            return a;
        }
    }
    catch(ex)
    {
    }
    
    // Older apps use the prefs system
    try 
    {
        var prefSvc = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
              
        var clsID = prefSvc.getBranch("app.").getCharPref("id");
        
        if (clsID && clsID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}")
        {
            var ver = prefSvc.getBranch("app.").getCharPref("version");
            
            a = "Thunderbird " + ver;
            return a;
        }
    }
    catch(ex)
    {
    }

    return a;
}