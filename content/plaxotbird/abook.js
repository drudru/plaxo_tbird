
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


////////////////////////////////////////////////////////////////////
//
//
// PlxAddressBookMgr
//
//

// This code is the kernel of sync


function PlxAddressBookMgr()
{
    this.isInited = false;
    this.remoteFolders = {};
    this.remoteFolders.folders = { 'Contacts' : [], 'Calendar' : [], 'Tasks' : [], 'Notes' : [] };
    this.localFolders = [];
    
    this.log  = gLogSys.getLogger('abook');
}


PlxAddressBookMgr.prototype.init = function(getRemotes)
{
    if (getRemotes == undefined)
        getRemotes = true;

    if (this.isInited)
    {
        this.log.debug("abook Mgr already init");
        return true;
    }

    this.log.debug("abook Mgr doing init");
    this._getLocalFolders();
    
    if (getRemotes)
        this._getRemoteFolders();
        
    // XXX : Re-eval the need for the folder map
    //    if (this._loadFolderMapping())
    if (this._loadFolderDBs())
        this.isInited = true;
        
    this.log.debug("abook Mgr returnng init: " + this.isInited);
    return this.isInited;
}


PlxAddressBookMgr.prototype._getRemoteFolders = function ()
{
    var myBag = {};
    myBag.body    = "['Get', 'Type', 'folder', 'Target', 'folders']\n";
    myBag.folders = { 'Contacts' : [], 'Calendar' : [], 'Tasks' : [], 'Notes' : [] };
    myBag.log     = this.log;
    myBag.good    = false;

    
    // anon function which will process statements
    myBag.handler = function (s)
    {
        
        var d = gPlxHttpMgr.convertToDict(arguments);
        
        // XXX : Handle better
        if (d == undefined)
            return;
        
        if (d.cmd._type == 'Status')
        {
            if (d.cmd.Code == 200)
                myBag.good = true;
        }
        if (myBag.good && d.cmd._type == 'Item' && d.cmd.Type == 'Folder')
        {
            var key = '';
            switch (d.data.Type)
            {
                case '0': key = 'Contacts'; break;
                case '1': key = 'Calendar'; break;
                case '2': key = 'Tasks'; break;
                case '3': key = 'Notes'; break;
            }
            
            // No support for anything but contact folders yet
            if (key != 'Contacts')
                return;
                
            var o = new PlxContactFolder();
            //                     Name,            netid,      isDeleted,   isdefault
            o.setRemoteFolder(d.data.DisplayName, d.data.FolderID, 0, d.data.IsDefault);
            
            if (d.data.IsDefault == '1')
                myBag.folders[key].unshift( o );
            else
                myBag.folders[key].push( o );
                
            myBag.log.debug("Pushed a " + key + " folder.");
        }
    }
    
    myBag.reason = "Getting Folder List...";
    var ret = gPlxHttpMgr.restPOSTCall(myBag);
    
    if (!ret)
    {
        this.log.error("Failed to get the remote folder list. Stopping");
        alert("Failed to get the remote folder list. Stopping");
        return 0;
    }

    this.remoteFolders = {};
    this.remoteFolders.folders  = myBag.folders;
    this.log.info("Got from remote");
    this.log.info("Length: " + this.remoteFolders.folders['Contacts'].length);
    for (var i = 0; i < this.remoteFolders.folders['Contacts'].length; i++)
    {
        this.log.info("Remote Folder: " + this.remoteFolders.folders['Contacts'][i].name);
    }
    
    return 1;
}



PlxAddressBookMgr.prototype._getLocalFolders = function ()
{
    var num = {};
    var list = gPlxPrefsMgr.getChildList("ldap_2.servers", num);
    
    this.localFolders = [];
    
    for (var i = 0; i < list.length; i++)
    {
        if (list[i].indexOf('filename') == -1)
            continue;

        var uri = gPlxPrefsMgr.getCharPref(list[i]);

        // Ignore the history folder
        if (uri.indexOf('history') > -1)
            continue;

        var name = '';
        if (uri == 'abook.mab')
        {
            // XXX : Do the chrome/properties lookup i18n
            name = "Personal Address Book";
        }
        else
        {
            var idx = list[i].lastIndexOf('.');
            var key = list[i].substring(0, idx) + '.description';
            name = gPlxPrefsMgr.getCharPref(key);
            
            // XXX : Only support one local folder for now
            continue;
        }
        
        var o = new PlxContactFolder()
        o.setLocalFolder(name, uri);
        
        this.localFolders.push( o );
    }
}


PlxAddressBookMgr.prototype.Dump = function (showIDs)
{
    if (arguments.length == 0)
        showIDs = false;
        
    this.log.log("LocalFolders");
    for (var i = 0; i < this.localFolders.length; i++)
    {
        o = this.localFolders[i];
        o.Dump(showIDs);
    }
    
    this.log.log("-------------------------------------------");
    this.log.log("RemoteFolders");
    for (var i = 0; i < this.remoteFolders.folders['Contacts'].length; i++)
    {
        o = this.remoteFolders.folders['Contacts'][i];
        o.Dump();
    }
    this.log.info("-------------------------------------------");
}


// XXX : Not used
PlxAddressBookMgr.prototype.writeFolderMapping = function ()
{
    // write to file
    var data = new PlxStrStream();
    data.writeLn('plxfoldermap,0');
    
    var locals = this.localFolders;
    for (var i = 0; i < locals.length; i++)
    {
        
        data.write("D(['foldermap',");
        
        data.write(locals[i].uri + ",");
        
        if (locals[i].netID == undefined)
        {
            data.write("-1,");
            data.write("''");
        }
        else
        {
            data.write(locals[i].netID + ",");
            data.write("'" + locals[i].remoteName + "'");
        }
            
        data.writeLn("]);");
    }

    var f = new PlxFile();
    f.name = 'plxfoldermap.plx';
    f.write(data.data);
    
    // XXX : Todo - handle the error case
}


// XXX : Not used
PlxAddressBookMgr.prototype._loadFolderMapping = function ()
{
    var f = new PlxFile();
    f.name = 'plxfoldermap.plx';
    
    if (! f.exists())
        return false;
    
    var data = f.read();
    
    var myBag = {};
    myBag.handler = function (s)
    {
        var a = arguments[0];
        
        if (a[0] == 'folderMap')
        {
            myBag.contacts = [];
            myBag.revision = a[1];
            myBag.netID = a[2];
            myBag.remoteName = a[3];
            myBag.lastSync = a[4];
        }
    }


    // process the data
    try 
    {
        D = myBag.handler;
        eval(data);
    } catch (ex)
    {
        this.log.error(ex);
        this.log.error('Bad eval: ' + data);
        return false;
    }
    
    
    for (var i = 0; i < myBag.contacts.length; i++)
    {
        var c = myBag.contacts[i];
        this.contacts[c.localID] = c;
    }
    
    return true;
}


PlxAddressBookMgr.prototype._loadFolderDBs = function ()
{
    var isInited = false;
    
    for (var i = 0; i < this.localFolders.length; i++)
    {
        // XXX : Do more thorough consistency check
        if (this.localFolders[i].loadDB())
            isInited = true;
    }
    
    return isInited;
}


PlxAddressBookMgr.prototype.syncFolders = function (type)
{
    if (type == undefined)
        type = 'fast';
        
    this.log.info('syncFolders : starting : type: ' + type);
    for (var i = 0; i < this.localFolders.length; i++)
    {
        this.log.info('syncFolders : folder1 : ' + this.localFolders[i].name);
        
        if (this.localFolders[i].netID != undefined)
        {
            this.log.info('syncFolders : folder: ' + this.localFolders[i].name);
            var r = this.localFolders[i].syncFolder(type);
            
            // Invariant check
            AssertString(r);
            AssertIsInList(r, ['Ok', 'needsSlowSync', 'error', 'cancel']);
            
            if (r == 'needsSlowSync')
            {
                r = this.localFolders[i].syncFolder('slow');
                // XXX : Handle this error condition
                
                if (r != 'Ok')
                {
                    this.log.error("BAD NEWS ... THE SYNC DIDN'T WORK: " + r);
                }
            }
            
            if (r == 'cancel')
            {
                this.log.error("Plaxo sync was cancelled.");
                alert("Plaxo sync was cancelled by the user.\nThe system will not be in sync until a full Plaxo sync completes.");
            }
        }
    }
}

PlxAddressBookMgr.prototype.resetAccount = function ()
{
    for (var i = 0; i < this.localFolders.length; i++)
    {
        if (this.localFolders[i].netID != undefined)
        {
            this.log.warn('resetAccount : folder: ' + this.localFolders[i].name);
            
            this.localFolders[i].resetFolder();
        }
    }
    
    this.isInited = false;

}

PlxAddressBookMgr.prototype.getDefaultFolder = function ()
{

    // XXX: Implement or remove
    return this.localFolders[0];
            
    for (var i = 0; i < this.localFolders.length; i++)
    {
        if (this.localFolders[i].netID != undefined)
        {
            return this.localFolders[i];
        }
    }
}

PlxAddressBookMgr.prototype.testLocate = function (id)
{
    var f = this.getDefaultFolder();
    
    return f.locateContact(id);
}

PlxAddressBookMgr.prototype.testLocate2 = function (id)
{
    var f = this.getDefaultFolder();
    
    return f.oldLocateContact(id);
}































////////////////////////////////////////////////////////////////////
//
//
// PlxContactFolder
//
//


function PlxContactFolder()
{
    this.contacts = [];
    this.lastSync = 0;
}

PlxContactFolder.prototype.init = function()
{
}


PlxContactFolder.prototype.setLocalFolder = function(name, uri)
{
    this.name = name;
    this.uri = uri;
    this.type = 'local';
    
    this.log  = gLogSys.getLogger('lfolder');
    this.contactLogger = gLogSys.getLogger('lfolder.contact');
}

PlxContactFolder.prototype.setRemoteFolder = function(name, netid, isDeleted, isDefault)
{
    this.name = name;
    this.remoteName = name;
    this.netID = netid;
    this.isDeleted = isDeleted;
    this.isDefault = isDefault;
    this.type = 'remote';

    this.log  = gLogSys.getLogger('rfolder');
    this.contactLogger = gLogSys.getLogger('rfolder.contact');
}

PlxContactFolder.prototype.Dump = function(showIDs)
{
    if (arguments.length == 0)
        showIDs = false;
        
    if (this.type == 'remote')
    {
        this.log.log("Remote: " + this.name + " netid: " + this.netID + " isDel: " + this.isDeleted + " isDefault: " + this.isDefault);
    }
    else
    {
        this.log.log("Local: " + this.name + " uri: " + this.uri);
        if (showIDs)
            this.DumpIDs();
    }
}


PlxContactFolder.prototype.loadDB = function ()
{
    var f = new PlxFile();
    f.name = 'plx_' + this.uri.replace('\.mab', '') + '.plx';
    
    this.log.debug("Attempt to load: " + f.name);
    
    if (! f.exists())
        return false;
    
    this.log.debug("Loading file...");
    
    var data = f.read();
    
    // XXX : Todo - verify the file
    
    
    var myBag = {};
    myBag.handler = function (s)
    {
        var a = arguments[0];
        
        if (a[0] == 'folder')
        {
            if (a.length == 4)  // Original format
            {
                myBag.contacts = [];
                myBag.netID = a[1];
                myBag.remoteName = a[2];
                myBag.lastSync = a[3];
                myBag.version = 0;
            }
            else
            {
                myBag.contacts = [];
                myBag.version = a[1];
                myBag.netID = a[2];
                myBag.remoteName = a[3];
                myBag.lastSync = a[4];
            }
        }
        if (a[0] == 'contact')
        {
            var c = { 'localID' : a[1] };
            myBag.contacts.push( c );
            //this.log.debug('contact: ' + a[1]);
        }
    }

    this.log.debug('loaded file');

    // process the data
    try 
    {
        D = myBag.handler;
        eval(data);
    } catch (ex)
    {
        this.log.error(ex);
        this.log.error('Bad eval: ' + data);
        return false;
    }
    
    // copy the data over
    this.netID      = myBag.netID;
    this.remoteName = myBag.remoteName;
    this.lastSync   = myBag.lastSync;
    
    for (var i = 0; i < myBag.contacts.length; i++)
    {
        var c = myBag.contacts[i];
        this.contacts[c.localID] = c;
    }
    
    return true;
}

PlxContactFolder.prototype.writeDB = function ()
{
    // write to file
    var data = new PlxStrStream();
    
    // Version of this format
    var ver = 1;          
    //replace "'" with "\'"
    data.writeLn("D(['folder'," + ver + "," + this.netID + ",'" + this.remoteName.replace(/\'/g, "\\\'") +
                 "'," + this.lastSync + "]);");
    
    for (var i in this.contacts)
    {
        if (this.contacts[i] == undefined)      // probably deleted
            continue;
            
        data.writeLn("D(['contact'," + i + "]);");
    }

    var f = new PlxFile();
    f.name = 'plx_' + this.uri.replace('\.mab', '') + '.plx';
    f.write(data.data);
}

PlxContactFolder.prototype.resetFolder = function ()
{
    // copy the data over
    this.netID      = undefined;
    this.remoteName = '*reset*';
    this.lastSync   = 0;

    var f = new PlxFile();
    f.name = 'plx_' + this.uri.replace('\.mab', '') + '.plx';
    
    if (f.exists())
    {
        f.deleteFile();
        this.log.warn("Deleted file: " + f.name);
    }
}


PlxContactFolder.prototype.syncFolder = function (syncType)
{
    AssertString(syncType);
    AssertIsInList(syncType, ['slow', 'fast']);

    var lastSyncTime = this.lastSync;
    
    if ((lastSyncTime == 0) && (syncType == 'fast'))
        return 'needsSlowSync';
        
    if (syncType == 'slow')
        lastSyncTime = 0;

    
    this.log.info('Syncing...' + this.uri + ' with ' + this.remoteName + 'syncTime: ' + lastSyncTime);
    
    var contacts = this.scanContacts(lastSyncTime);

    var d = new Date();
    var newSyncTime = d.getTime() / 1000;
    
    var request = this.buildSyncRequest(syncType, contacts, lastSyncTime, newSyncTime);
    
    this.log.info("Request: " + request);
    var myBag = {};
    myBag.reason  = "Performing " + syncType + " sync ...";
    myBag.body    = request;
    myBag.result  = { 'Header' : {}, 'Status' : {}, 'Sync' : {}, 'Data' : [] };
    myBag.log     = this.log;
    myBag.handler = function()
    {
        var d = gPlxHttpMgr.convertToDict(arguments);
        
        if (d == undefined)
        {
            myBag.log.fatal("Bad message");
            return;
        }
        
        if ( isInList(d.cmd._type, ['Header', 'Status', 'Sync']) )
        {
            myBag.result[d.cmd._type] = d.cmd;
            return;
        }

        if ( isInList(d.cmd._type, ['Replace', 'Add', 'Delete']) )
        {
            myBag.result.Data.push( d );
            return;
        }
        
        if ( isInList(d.cmd._type, ['/Header', '/Status', '/Sync']) )
            return;
        
        myBag.log.debug("Unknown message: " + d.cmd._type);
    }


    //this.log.info('sending Up: ' + contacts.length);
    
    var ret = gPlxHttpMgr.restPOSTCall(myBag);
    
    if (!ret)
    {
        // XXX: Need better error handling
        //if (theirBag) theirBag.reason = 'Server Communication Error';
        this.log.error("Failed to sync. Remote server error. Stopping");
        alert("Failed to sync. Remote server error. Stopping");
        return 'error';
    }

    //this.log.debug('Handle contacts: ' + myBag.contacts.recs.length + 'rev: ' + myBag.contacts.revision);
    
    var r = this.handleSyncReply(contacts, myBag.result);
        
    if (r == 'Ok')
    {
        this.lastSync = newSyncTime;
        this.log.debug('Writing out DB');
        this.writeDB();                 // Write out anchors
    }
    if (r == 'cancel')
    {
        // Reset the folder
        this.lastSync = 0;
    }

    AssertString(r);
    AssertIsInList(r, ['Ok', 'needsSlowSync', 'error', 'cancel']);
    
    return r;
}


//
// scanContacts
//
//   Scan for contacts in this folder since last modified time
//   It also has to match up the found contact with the in memory
//   contact
//
PlxContactFolder.prototype.scanContacts = function(lastSyncTime)
{

    AssertNumber(lastSyncTime);

    this.log.log("Scanning contacts modified after: " + lastSyncTime);
 
    // Make copy of our data structure - we'll use this to see what is missing
    var contactsCopy = [];
    
    if (lastSyncTime > 0)
        for (var i in this.contacts)
            contactsCopy[i] = this.contacts[i];  // copy - don't use slice (it makes the sparse array un-sparse)
    
    
    var abURI = "moz-abmdbdirectory://" + this.uri;
    var rdf=Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var directory = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);
    var childE=directory.childCards;
       
    
    // Iterate through all the contacts
    var cards = [];

    try {
        childE.first();

        while( 1 ) 
        { 
            var card = childE.currentItem().QueryInterface( Components.interfaces.nsIAbCard );
            var mdbCard = childE.currentItem().QueryInterface( Components.interfaces.nsIAbMDBCard );
                     
            if (contactsCopy[mdbCard.key] != undefined)         // mark the contact as seen
                delete contactsCopy[mdbCard.key];
            
            //we will ignore maillist for now
            if (card.isMailList)
            {
              childE.next();
              continue;
            }
            
            var key = mdbCard.getStringAttribute('PlxKey');
            if (key == null)
            {
                mdbCard.setStringAttribute('PlxKey', mdbCard.key);
                this.log.debug('setting key: ' + mdbCard.key + ' - ' + card.primaryEmail);
            }
            else
                this.log.debug('key: ' + mdbCard.key + ' already defined - ' + card.primaryEmail);
            
            if ((lastSyncTime == 0) || (this.contacts[mdbCard.key] == undefined) || (card.lastModifiedDate > lastSyncTime))
            {
                var c = new PlxContact(this.contactLogger);
                c.initFromCards(card, mdbCard);
                cards.push(c);
                if (this.contacts[c.localID] == undefined)
                {
                    c.action = 'Add';
                    //this.log.debug("For Replace Card lastmodified: " + card.lastModifiedDate);
                }
                else
                {
                    c.action = 'Replace';
                    //this.log.debug("For Replace Card lastmodified: " + card.lastModifiedDate);
                }
            }
            childE.next();
        }
    }
    catch( ex if ex.name == 'NS_ERROR_INVALID_POINTER')
    {
        // Ignore the iterator exception
    }
    catch( ex )
    {
        if (ex instanceof Components.interfaces.nsIXPCException)
            this.log.error('  rv: ' + ex.result);
        this.log.error('name: ' + ex.name);
        this.log.error('type: ' + typeof(ex));
        this.log.error('mesg: ' + ex.message);
        this.log.error('stak: ' + ex.stack);
    }
    
 
    // Any contacts that we knew about and that are gone, we mark as deleted
    for (var i in contactsCopy)
    {
        if (contactsCopy[i] == undefined)
            continue;
            
        var c = { action : 'Delete' };
        c.localID = i;
        cards.push(c);
    }
    
    return cards;
}




PlxContactFolder.prototype.buildSyncRequest = function(syncType, contacts, lastSyncTime, nextSyncTime)
{

    AssertString(syncType);
    AssertIsInList(syncType, ['slow', 'fast']);
    AssertArray(contacts);
    AssertNumber(lastSyncTime);
    AssertNumber(nextSyncTime);


    var str = new PlxStrStream(); 

    str.write("['Sync'");
    str.write(", 'SyncType', '" + syncType + "'");
    str.write(", 'Target', 'contacts/" + this.netID + "'");
    str.write(", 'Source', '" + this.name + "'");
    str.write(", 'LastAnchor', '" + lastSyncTime + "'");
    str.write(", 'NextAnchor', '" + nextSyncTime + "'");
    str.writeLn("]");

    this.log.info('Rendering: ' + contacts.length + ' contacts');
    
    var t = new PlxTimer();
    t.start();
    
    {
        var myBag = new Object();
        
        myBag.obj      = this;
        myBag.funcName = 'actualBuildSyncRequest';
        myBag.cmds     = contacts;
        myBag.title    = "Building Sync request...";
        myBag.arg1     = str;
        myBag.cancel   = false;
        
        window.openDialog("chrome://plaxotbird/content/syncprogress.xul", "Sync Progress", "chrome,modal,centerscreen", myBag);
    }
    
    str.writeLn("['/Sync']");

    AssertString(str.data);
    Assert(str.data.length > 10);

    t.stop();
    t.Dump(this.log, 'info', "handleSyncReply");
    this.log.info('Finished rendering: ' + contacts.length + ' contacts');
    this.log.debug("Sending up:\n" + str.data + "\n-*--*--*--*--*--*--");
    return str.data;
}
    

PlxContactFolder.prototype.actualBuildSyncRequest = function(contact, str)
{
    var c = contact;
    str.write("['" + c.action + "'");
    str.write(", 'Type', 'contact'");
    str.write(", 'ItemID', '" + c.localID + "'");            
    if (isInList(c.action, ['Replace', 'Add']))  // deletes have no data
    {
        str.write("], ['Data'");
        str.write( c.renderData() );
    }
    str.writeLn("]");
}


PlxContactFolder.prototype.handleSyncReply = function(contacts, bag)
{
    var r = 'error';

    this.log.log("handleSyncReply: Status  Code: " +  bag.Status.Code + ' Mesg: ' + bag.Status.Message);
    
    if (bag.Status.Code == '420' || bag.Status.Code == '412')
    {
        r = 'needsSlowSync';    
    }
    else if (bag.Status.Code == '200')
    {
        var t = new PlxTimer();
        t.start();
        // GOOD NEWS - The server has done what we asked!
        
        // Handle all the contacts we sent up first with our internal database
        this.log.info("handleSyncReply: making our internal store consistent");
        for (var i = 0; i < contacts.length; i++)
        {
            if (contacts[i].action == 'Add')
                this.contacts[contacts[i].localID] = contacts[i];
                
            if (contacts[i].action == 'Delete')
                delete this.contacts[contacts[i].localID];
        }
        t.stop();
        t.Dump(this.log, 'info', "handleSyncReply: contacts handling");

        t.start();
        var contactsToMap = [];
        var myBag = new Object();
        
        myBag.obj      = this;
        myBag.funcName = 'actualHandleSyncCmd';
        myBag.cmds     = bag.Data;
        myBag.title    = "Handling Sync reply...";
        myBag.arg1     = contactsToMap;
        myBag.cancel   = true;
        
        window.openDialog("chrome://plaxotbird/content/syncprogress.xul", "Sync Progress", "chrome,modal,centerscreen", myBag);
    
        if (!myBag.isGood)
        {
            this.log.info("syncprogress cancelled.");
            // BAD NEWS - Now we don't record in our internal database
            r = 'cancel';
        }
        else
        {
            if (contactsToMap.length > 0)
                r = this.sendMapRequest(contactsToMap);
            
            // XXX: This is not optimal, we should at least output an error message
            r = 'Ok';
        }
        t.stop();
        t.Dump(this.log, 'info', "handleSyncReply");
    }
    
    this.log.log("handleSyncReply result: " + r);
    AssertString(r);
    AssertIsInList(r, ['Ok', 'needsSlowSync', 'error', 'cancel']);
    
    return r;
}


// This is the routine that gets called by the syncprogress dialog
PlxContactFolder.prototype.actualHandleSyncCmd = function(cmd, contactsToMap)
{
    var t = new PlxTimer();
    t.start();
    if (cmd.cmd._type == 'Delete')
        if (this.contacts[ cmd.cmd.ItemID ] == undefined)
        {
            t.stop();
            t.Dump(this.log, 'warn', "***Delete of unknown contact localID: " + cmd.cmd.ItemID);
        }
        else
        {
            this.deleteLocalContact(cmd.cmd.ItemID);
            delete this.contacts[ cmd.cmd.ItemID ];
            t.stop();
            t.Dump(this.log, 'info', "handleSyncReply: deleted contact" + cmd.cmd.ItemID);
        }

    if (cmd.cmd._type == 'Replace')
        if (this.contacts[ cmd.cmd.ItemID ] == undefined)
        {
            t.stop();
            t.Dump(this.log, 'warn', "***Replace of unknown contact localID: " + cmd.cmd.ItemID);
        }
        else
        {
            var card = this.locateContact(cmd.cmd.ItemID);
            if (!card)
            {
                this.log.info("Ok, needed to replace, but had to create a new contact");
                card = this.createBlankContact();
            }
                
            var c = new PlxContact(this.contactLogger);
            c.initFromCard(card);
            
            c.updateWithData(card, cmd.data);
            
            this.storeCard(card);
            t.stop();
            t.Dump(this.log, 'info', "handleSyncReply: replaced contact " + cmd.cmd.ItemID);
        }

    if (cmd.cmd._type == 'Add')
        {
            var card = this.createBlankContact();
            var c = new PlxContact(this.contactLogger);
            c.initFromCard(card);
            
            c.updateWithData(card, cmd.data);
            c.serverID = cmd.cmd.ServerItemID;         // Important
            
            this.storeCard(card);
            
            contactsToMap.push( c );
            t.stop();
            t.Dump(this.log, 'info', "handleSyncReply: added contact : ServerItemID" + cmd.cmd.ServerItemID);
        }
}



PlxContactFolder.prototype.sendMapRequest = function(contactsToMap)
{
    AssertArray(contactsToMap);
    Assert( (contactsToMap.length > 0) );
    
    var r = '';
    var request = this.buildMapRequest(contactsToMap);
    
    var myBag = {};
    myBag.reason  = "Performing sync mapping ...";
    myBag.body    = request;
    myBag.result  = { 'Header' : {}, 'Status' : {} };
    myBag.log     = this.log;
    myBag.handler = function()
    {
        var d = gPlxHttpMgr.convertToDict(arguments);
        
        if (d == undefined)
        {
            myBag.log.error("Bad message");
            return;
        }
        
        if ( isInList(d.cmd._type, ['Header', 'Status']) )
        {
            myBag.result[d.cmd._type] = d.cmd;
            return;
        }

        if ( isInList(d.cmd._type, ['/Header', '/Status']) )
            return;
        
        myBag.log.debug("Unknown message: " + d.cmd._type);
    }
    
    var ret = gPlxHttpMgr.restPOSTCall(myBag);
    
    if (!ret)
    {
        // XXX: Need better error handling
        //if (theirBag) theirBag.reason = 'Server Communication Error';
        this.log.error("Failed to send 'Sync Map' reply. Stopping");
        alert("Failed to send 'Sync Map' reply. Stopping");
        return 'error';
    }
    
    if (myBag.result.Status.Code == '200')
    {
        for(var i = 0; i < contactsToMap.length; i++)
            this.contacts[ contactsToMap[i].localID ] = contactsToMap[i];
        
        r = 'Ok';
    }
    else
    {
        // Delete the created contacts
        for(var i = 0; i < contactsToMap.length; i++)
            this.deleteLocalContact(contactsToMap[i].localID);
        r = 'error';
    }
    
    AssertString(r);
    AssertIsInList(r, ['Ok', 'error']);
}


PlxContactFolder.prototype.buildMapRequest = function(contacts)
{

    AssertArray(contacts);
    Assert( (contacts.length > 0) );


    var str = new PlxStrStream(); 

    str.write("['Map'");
    str.write(", 'Target', 'contacts/" + this.netID + "'");
    str.write(", 'Source', '" + this.name + "'");
    str.writeLn("]");

    for( var i = 0; i < contacts.length; i++)
    {
        var c = contacts[i];
        str.write("['MapItem'");
        str.write(", 'Type', 'contact'");
        str.write(", 'ServerItemID', '" + c.serverID + "'");            
        str.write(", 'ItemID', '" + c.localID + "'");            
        str.writeLn("]");
    }
    
    str.writeLn("['/Map']");

    AssertString(str.data);
    Assert(str.data.length > 10);

    return str.data;
}
    

PlxContactFolder.prototype.storeCard = function(abCard)
{
    abCard.editCardToDatabase("moz-abmdbdirectory://" + this.uri);
}

// c is an object with all the necessary fields
PlxContactFolder.prototype.createLocalContact = function(c)
{
    var abURI = "moz-abmdbdirectory://" + this.uri;
    var rdf=Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var directory = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);
    
    var abCardInst = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance();
    var abCard = abCardInst.QueryInterface(Components.interfaces.nsIAbCard);
    
    for (var fn in this.fields)
    {
        if ((c[fn] == undefined) || (this.fields[fn] != ''))
            continue;
        abCard[fn] = c[fn];
    }
    

    var nc = directory.addCard(c);
    var mdbCard = nc.QueryInterface( Components.interfaces.nsIAbMDBCard );
    this.log.info('Created card: ' + c['primaryEmail'] + '  key: ' + mdbCard.key + ' lastMod: ' + nc.lastModifiedDate);
    c.localID = mdbCard.key;
    
    for (var fn in this.fields)
    {
        if ((c[fn] == undefined) || (this.fields[fn] == ''))
            continue;
        mdbCard.setStringAttribute(this.fields[fn], c[fn]);
    }
    
    mdbCard.setStringAttribute('PlxNetID', c.netID);
    mdbCard.setStringAttribute('PlxLinked', c.linked);
    mdbCard.setStringAttribute('PlxSendState', c.send_state);
    mdbCard.setStringAttribute('PlxNeedsAccept', c.needs_accept);
    
    return abCard;
}


PlxContactFolder.prototype.createBlankContact = function()
{
    var abURI = "moz-abmdbdirectory://" + this.uri;
    var rdf=Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var directory = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);
    
    var abCardInst = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance();
    var abCard = abCardInst.QueryInterface(Components.interfaces.nsIAbCard);

    var nc = directory.addCard(abCard);
    var mdbCard = nc.QueryInterface( Components.interfaces.nsIAbMDBCard );
    this.log.info('Created card  lid: ' + mdbCard.key + ' lastMod: ' + nc.lastModifiedDate);
        
    return nc;
}




// c is an object with all the necessary fields
PlxContactFolder.prototype.updateLocalContact = function(c, method)
{
    var abCard = this.locateContact(c, method);
    
    if (method == 'useLocalID' && abCard == undefined)
    {
        this.log.error("Ok, needed to update, but couldn't find contact");
        return this.createLocalContact(c, method);
    }
        
    Assert(abCard != undefined);

    //this.deleteLocalContact(c, method);
    //return this.createLocalContact(c);
    
    for (var fn in this.fields)
    {
        if (this.fields[fn] != '')
            continue;
        abCard[fn] = ((c[fn] == undefined) ? '' : c[fn]);
    }
    
    
    var mdbCard = abCard.QueryInterface( Components.interfaces.nsIAbMDBCard );
    this.log.info('Updated card: ' + c['primaryEmail'] + '  key: ' + mdbCard.key + ' lastMod: ' + abCard.lastModifiedDate);
    c.localID = mdbCard.key;
 
    for (var fn in this.fields)
    {
        if (this.fields[fn] == '')
            continue;
        mdbCard.setStringAttribute(this.fields[fn], ((c[fn] == undefined) ? '' : c[fn]) );
    }
 

    mdbCard.setStringAttribute('PlxNetID', c.netID);
    mdbCard.setStringAttribute('PlxLinked', c.linked);
    mdbCard.setStringAttribute('PlxSendState', c.send_state);
    mdbCard.setStringAttribute('PlxNeedsAccept', c.needs_accept);
        
    abCard.editCardToDatabase("moz-abmdbdirectory://" + this.uri);
    
    return abCard;
}

PlxContactFolder.prototype.deleteLocalContact = function(id)
{
    Assert(id);
    
    var abCard = this.locateContact(id);
    
    if (!abCard)
    {
        this.log.error('Delete of card by method: ' + method + ' id: ' + id + ' failed.');
        return;
    }
    
    
    var abURI = "moz-abmdbdirectory://" + this.uri;
    var rdf=Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var directory = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);
  
    //deleting contact this way somehow will throw exception
    //here we just catch it without doing anything and it seems working fine
    try {
        var cardsInst = Components.classes["@mozilla.org/supports-array;1"].createInstance();
        var cardsArray = cardsInst.QueryInterface(Components.interfaces.nsISupportsArray); 
        cardsArray.AppendElement(abCard);
        directory.deleteCards( cardsArray );
        this.log.info('Delete of card id: ' + id + ' succeeded.');
    }
    catch( ex )
    {
      this.log.debug("Mozilla XPCOM deleteCards Exception");
    }
}

// the old, but reliable locate contact
PlxContactFolder.prototype.oldLocateContact = function(id)
{
    var abURI = "moz-abmdbdirectory://" + this.uri;
    var rdf=Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var directory = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);
    var childE=directory.childCards;
    
    // XXX : Refactor this all out once we are sure the needs are gone
    var method = 'useLocalID';
    
    var card = undefined;
    this.log.debug("locateContact: " + method);
    
    try 
    {
        childE.first();
        var found = false;
        while( 1 )
        {
            card=childE.currentItem().QueryInterface( Components.interfaces.nsIAbMDBCard );
            
            if ((method == 'useLocalID') && (card.key == id))
                found = true;
/*
            if ((method == 'useNetID') && (card.getStringAttribute('PlxNetID') == id))
                found = true;
*/
        
            if (found)        
            {
                this.log.debug("foundCard: " + method + "nid/lid: " + 0 + "/" + id);
                card = card.QueryInterface( Components.interfaces.nsIAbCard );
                return card;
            }
            childE.next();
        }
    }
    catch( ex ) 
    {
        this.log.debug("Stupid Mozilla XPCOM/JS/ENUM Exception");
    }
    
    return undefined;
}


PlxContactFolder.prototype.locateContact = function(id)
{
    var abURI = "moz-abmdbdirectory://" + this.uri;
    var rdf=Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var directory = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);
    //var childE=directory.childCards;
    
    var addressBook = Components.classes[ "@mozilla.org/addressbook;1" ].createInstance();
    addressBook = addressBook.QueryInterface( Components.interfaces.nsIAddressBook );
    
    //this.log.debug("addressBook: " + addressBook);
    db = addressBook.getAbDatabaseFromURI(abURI);
    //this.log.debug("db: " + db);
    
    
    //var db = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAddrDatabase);
    
    //var card = db.getCardFromAttribute(directory, "RecordKey", id, false);    
    //this.log.debug("Test LocateCard key: " + id + " card: " + card);

    //id = "drew@plaxo.com";
    //var card = db.getCardFromAttribute(directory, "PrimaryEmail", id, false);    
    //this.log.debug("Test LocateCard key: " + id + " card: " + card);

    var card = db.getCardFromAttribute(directory, "PlxKey", id, false);
    
    return card;
}

PlxContactFolder.prototype.DumpIDs = function()
{
    var abURI = "moz-abmdbdirectory://" + this.uri;
    var rdf=Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var directory = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);
    var childE=directory.childCards;
    
    
    try 
    {
        childE.first();

        while( 1 ) 
        {
            var card = childE.currentItem().QueryInterface( Components.interfaces.nsIAbCard );
            var mdbCard = childE.currentItem().QueryInterface( Components.interfaces.nsIAbMDBCard );
                     
            this.log.log(" - " + mdbCard.key + " - " + card.primaryEmail);
            
            childE.next();
        }
    }
    catch( ex )
    {
        // XXX: Make sure we are catching the proper exception
        this.log.info("Stupid Mozilla XPCOM/JS/ENUM Exception");
    }
}






////////////////////////////////////////////////////////////////////
//
//
// PlxContact
//
//


function PlxContact(logger)
{
    this.log = logger;
}


PlxContact.prototype.fields =
    {
        AIMScreenName         : 'aimScreenName',
        AssistantName         : '*IGNORE*',
        AssistantPhone        : '*IGNORE*',
        Birthday              : '*IGNORE*',
        Category              : 'category',
        PersonalEmail         : 'secondEmail',
        PersonalEmail2        : '*IGNORE*',
        PersonalEmail3        : '*IGNORE*',
        PersonalWebPage       : 'webPage2',
        PersonalMobilePhone   : 'cellularNumber',

        HomeAddress           : 'homeAddress',
        HomeAddress2          : 'homeAddress2',
        HomeCity              : 'homeCity',
        HomeState             : 'homeState',
        HomeZipCode           : 'homeZipCode',
        HomeCountry           : 'homeCountry',
        HomeFax               : '*IGNORE*',
        HomePhone             : 'homePhone',
        HomePhone2            : '*IGNORE*',
        
        DisplayName           : 'displayName',
        FirstName             : 'firstName',
        LastName              : 'lastName',
        MiddleName            : '*IGNORE*',
        ManagerName           : '*IGNORE*',
        NameSuffix            : '*IGNORE*',
        NameTitle             : '*IGNORE*',
        NickName              : 'nickName',
        
        Notes                 : 'notes',
        OtherAddress          : '*IGNORE*',
        OtherAddress2         : '*IGNORE*',
        OtherCity             : '*IGNORE*',
        OtherState            : '*IGNORE*',
        OtherZipCode          : '*IGNORE*',
        OtherCountry          : '*IGNORE*',
        OtherFax              : '*IGNORE*',
        OtherPhone            : '*IGNORE*',
        SpouseName            : 'spouseName',
        
        WorkPhone             : 'workPhone',
        WorkPhone2            : '*IGNORE*',
        BusinessMobilePhone   : '*IGNORE*',
        WorkPager             : 'pagerNumber',
        WorkFax               : 'faxNumber',
        JobTitle              : 'jobTitle',
        Company               : 'company',
        Department            : 'department',
        BusinessEmail         : 'primaryEmail',
        BusinessEmail2        : '*IGNORE*',
        BusinessEmail3        : '*IGNORE*',
        BusinessIM            : '*IGNORE*',
        BusinessWebPage       : 'webPage1',
        WorkAddress           : 'workAddress',
        WorkAddress2          : 'workAddress2',
        WorkCity              : 'workCity',
        WorkCountry           : 'workCountry',
        WorkState             : 'workState',
        WorkZipCode           : 'workZipCode',
        
        PlaxoState            : '*PlxState',
        BusinessPhoto         : '*PlxBusinessPhoto',
        PersonalPhoto         : '*PlxPersonalPhoto',
        BusinessMicroBlog     : '*PlxBusinessMicroBlog',
        PersonalMicroBlog     : '*PlxPersonalMicroBlog'
    };
                    
                    
PlxContact.prototype.send_states =
    [
         'unknown',              ///< nothing to send
         'none',                 ///< nothing to send
         'member',               ///< email needs to be sent
         'sending',              ///< email has been sent
         'sent',                 ///< email has been sent
         'replied',              ///< a reply has been received
         'bounced',              ///< a bounce (or timeout) has been received
         'Throttled'
    ]; 


PlxContact.prototype.init = function()
{
}


PlxContact.prototype.initFromCard = function(abCard)
{
    // XXX: Assert Preconditions

    var mdbCard = abCard.QueryInterface( Components.interfaces.nsIAbMDBCard );
    
    return this.initFromCards(abCard, mdbCard);
}

PlxContact.prototype.initFromCards = function(card, mdbCard)
{
    // XXX: Assert Preconditions

    this.localID = mdbCard.key;
    
    for (var fn in this.fields)
    {
        // We handle the birthday special
        // We don't send up Plaxo fields 
        if (fn == 'Birthday' || (this.fields[fn].indexOf('*') == 0))
            continue;
        this[fn] = card[this.fields[fn]];
    }
    
    // YYYYMMDD
    this['Birthday'] = '';
    if (card['birthYear'] && card['birthMonth'] && card['birthDay'])
    {
        var y = parseInt(card['birthYear']);
        var m = parseInt(card['birthMonth']);
        var d = parseInt(card['birthDay']);
        
        if (isNumber(y) && isNumber(m) && isNumber(d))
        {
            // XXX: Need to do a little more here for 2 digit years
            var t = padNumber(y, 4, '0') + padNumber(m, 2, '0') + padNumber(d, 2, '0');
            this['Birthday'] = t;
        }
    }
}


PlxContact.prototype.updateWithData = function(abCard, data)
{
    Assert(abCard != undefined);

    for (var fn in data)
    {
        // We handle the birthday special
        // We don't send up Plaxo fields 
        this.log.debug("Setting field: " + fn + " which has: " + data[fn]);
        this.log.debug(" -> " + this.fields[fn]);
        
        if (this.fields[fn] == undefined)
        {
            this.log.error("ERROR: Invalid field: " + fn);
            continue;
        }
        
        if (fn == 'Birthday' || (this.fields[fn].indexOf('*') == 0))
            continue;
            
        this.log.debug("Setting field: " + fn + " which is: " + this.fields[fn] + " which has: " + data[fn]);
        abCard[this.fields[fn]] = data[fn];
    }

    if (data['Birthday'] != undefined)
    {
        if (data['Birthday'] == '')
        {
            abCard['birthYear']  = '';
            abCard['birthMonth'] = '';
            abCard['birthDay']   = '';
        }
        else if (data['Birthday'].length == 8)
        {
            var b = data['Birthday'];
            abCard['birthYear']  = b.substring(0,4);
            abCard['birthMonth'] = b.substring(4,6);
            abCard['birthDay']   = b.substring(6,8);
        }
    }
    
    
    var mdbCard = abCard.QueryInterface( Components.interfaces.nsIAbMDBCard );
    for (var fn in data)
    {
        // We handle the birthday special
        // We don't send up Plaxo fields 
        
        if (this.fields[fn] == undefined)
        {
            // We log this check above so this redundantis commented out
            //    this.log.error("ERROR: Invalid field: " + fn);
            continue;
        }
        
        // If not a 'Plx' field
        if (this.fields[fn].indexOf('*Plx') != 0)
            continue;
        
        var plxfn = this.fields[fn].substring(1);           // Remove the asterisk and store
        mdbCard.setStringAttribute(plxfn, data[fn]);
    }

    return abCard;
}


PlxContact.prototype.renderData = function()
{
    var str = new PlxStrStream();

    for (var fn in this.fields)
    {
        // We don't send up Plaxo fields 
        if (this.fields[fn].indexOf('*') == 0)
            continue;
        this.log.debug("Sending field: " + fn + " which is: " + this[fn]);
        var txt = encodeURIComponent(this[fn]);
        
        // Escape single quotes
        txt = txt.replace(/\'/g, "%27");
        //txt = this[fn].replace(/\r/g, "\\x0d");
        this.log.debug("Sending field: " + fn + " which is: " + this[fn] + " | txt: " + txt);
        str.write(", '" + fn + "', '" + txt + "'");
    }

    AssertString(str.data);

    return str.data;
}


