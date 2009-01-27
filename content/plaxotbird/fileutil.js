
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

function PlxStrStream()
{
    this.data = '';
    
    this.writeLn = function(d)
    {
        this.data = this.data + d + '\n';
    }

    this.write = function(d)
    {
        this.data = this.data + d;
    }
}


function PlxFile()
{
    this.name = '';

    this.exists = function()
    {
        // Setup the paths
        var targetFile = Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties).
            get("ProfD", Components.interfaces.nsIFile);

        targetFile.append(this.name);
        
        return targetFile.exists();
    }
    
    this.readLines = function()
    {
        // Setup the paths
        var file = Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties).
            get("ProfD", Components.interfaces.nsIFile);

        
        file.append(this.name);

        // Write to the tmp
        var stream = Components.classes["@mozilla.org/network/file-input-stream;1"].
            createInstance(Components.interfaces.nsIFileInputStream);
            
        stream.init(file, 1, 0440, false);
        
        var istream = stream.QueryInterface(Components.interfaces.nsILineInputStream);
        
        // read lines into array
        var line = {}, lines = [];
        var moreData = true;
        while (moreData)
        {
          moreData = istream.readLine(line);
          lines.push(line.value); 
        }
        
        istream.close();
        
        return lines;
    }
    
    this.read = function()
    {
        // Setup the paths
        var file = Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties).
            get("ProfD", Components.interfaces.nsIFile);

        
        file.append(this.name);

        // Write to the tmp
        var stream = Components.classes["@mozilla.org/network/file-input-stream;1"].
            createInstance(Components.interfaces.nsIFileInputStream);
        var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"].
            createInstance(Components.interfaces.nsIScriptableInputStream);
            
        stream.init(file, 1, 0440, false);
        sstream.init(stream);
        
        var data = '';
        while (sstream.available())
            data += sstream.read(32768);
        
        sstream.close();        
        stream.close();
        
        return data;
    }
    
    
    this.write = function(data)
    {
        // Setup the paths
        var targetFile = Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties).
            get("ProfD", Components.interfaces.nsIFile);

        var tmpFile = Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties).
            get("ProfD", Components.interfaces.nsIFile);
        
        targetFile.append(this.name);
        tmpFile.append(this.name + ".tmp");
        
        // Remove the previous tmp
        if (tmpFile.exists())
            tmpFile.remove(false);

        // Write to the tmp
        var stream = Components.classes["@mozilla.org/network/file-output-stream;1"].
            createInstance(Components.interfaces.nsIFileOutputStream);
            
        // use 0x02 | 0x10 to open file for appending.
        // 0x02 == PR_WRONLY
        // 0x08 == PR_CREATE_FILE
        // 0x20 == PR_TRUNCATE
        stream.init(tmpFile, 0x02 | 0x08 | 0x20, 0640, 0);
        stream.write(data, data.length);
        stream.close();
        
        //Remove the source
        if (targetFile.exists())
            targetFile.remove(false);
            
        // Move the tmp over the previous source (yeah, I'd like to just 
        // move over the old, but what if this isn't unix??)
        tmpFile.moveTo(null, this.name);
    }
    
    this.deleteFile = function()
    {
        // Setup the path
        var tmpFile = Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties).
            get("ProfD", Components.interfaces.nsIFile);
        
        tmpFile.append(this.name);
        
        // Remove the previous tmp
        if (tmpFile.exists())
            tmpFile.remove(false);
    }
    
    this.getProfileDir = function()
    {
        // Setup the paths
        var targetFile = Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties).
            get("ProfD", Components.interfaces.nsIFile);
            
        return targetFile.path;
    }
}

