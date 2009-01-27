
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

include('chrome://plaxotbird/content/fileutil.js');

function Dump(text)
{

/*
    // We have to do it this way to avoid recursion)
    if (gPlxDebugPrefs == undefined)
    {
        gPlxDebugPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    }
    // Check if a pref exists
    var t = gPlxDebugPrefs.getPrefType('plaxo.plxDiagLogging');
    
    // If not a BOOL
    if (t != 128)
        return;
    
    log = gPlxDebugPrefs.getBoolPref('plaxo.plxDiagLogging');
    
    if (!log)
        return;
*/
        
    HardDump(text);
    
}


function HardDump(text)
{

    // XXX - Start using rollover code and PlxFile code

    var d = new Date()
    
    text = "[PLX " + d.toLocaleString() + "] " + text + '\r\n';
    
    // Setup the paths
    var targetFile = Components.classes["@mozilla.org/file/directory_service;1"].
        getService(Components.interfaces.nsIProperties).
        get("ProfD", Components.interfaces.nsIFile);

    targetFile.append("plx.log");

    var stream = Components.classes["@mozilla.org/network/file-output-stream;1"].
            createInstance(Components.interfaces.nsIFileOutputStream);
            
    // use 0x02 | 0x10 to open file for appending.
    // 0x01 == PR_RDONLY
    // 0x02 == PR_WRONLY
    // 0x04 == PR_RDWR
    // 0x08 == PR_CREATE_FILE
    // 0x10 == PR_APPEND
    // 0x20 == PR_TRUNCATE
    // 0x40 == PR_SYNC
    // 0x80 == PR_EXCL
    stream.init(targetFile, 0x02 | 0x08 | 0x10, 0640, 0);
    stream.write(text, text.length);
    stream.close();
}


function DumpObj(o, tf, level)
{
    if (arguments.length == 1)
        tf = false;
    if (arguments.length <= 2)
        level = 0;
    
    //var t = typeof(o);
    //Dump("1type: " + t + " tf: " + tf);
            
    Dump(spaces(level) + "{");
    for (var i in o)
    {
        if (!tf)
            Dump(spaces(level) + "   " + i + ": " + o[i]);
        else
        {
            var t = typeof(o[i]);
            switch ( t )
            {
                case 'object':
                        Dump(spaces(level) + "   " + i + ":");
                        DumpObj(o[i], true, level + 5);
                        break;
                case 'string':
                        Dump(spaces(level) + "   " + i + ": '" + o[i] + "'");
                        break;
                case 'function':
                case 'number':
                case 'boolean':
                case 'undefined':
                        Dump(spaces(level) + "   " + i + ": " + o[i]);
                        break;
                default:
                        Dump(spaces(level) + "  type: " + t + "  " + i + ": " + o[i]);
                        break;
            }
        }
    }
    Dump(spaces(level) + "}");
}




function Assert(expr)
{
    if (expr)
        return;

    try
    {
        throw new Error("JS assert failed"); 
    }
    catch(e)
    {
        alert(e.message + " stack: \n" + e.stack);
        gLog.fatal('Assert: ' + e.stack);
        throw new Error(e.message + "\n\n stack:\n" + e.stack);
    }
}

function AssertArray(a)
{
    Assert(isArray(a));
}

function AssertString(a)
{
    Assert(isString(a));
}

function AssertNumber(a)
{
    Assert(isNumber(a));
}

function AssertIsInList(v, set)
{
    AssertArray(set);
    
    Assert(isInList(v, set));
}

function isArray(a)
{
    return (a.constructor == Array);
}

function isString(a)
{
    return (typeof(a) == 'string');
}

function isNumber(a)
{
    return (typeof(a) == 'number' && isFinite(a));
}

function isInList(v, set)
{
    AssertArray(set);
   
    for (var i = 0; i < set.length; i++)
        if (v == set[i]) return true;
        
    return false;
 }




// Make n of m spaces (default for m is 1)
function spaces(n)
{
    AssertNumber(n);
    Assert( (n >= 0) );
    Assert( (n < 500) );
    
    var s = pad('', n, ' ');
    
    AssertString(s);
    Assert((s.length == n));
    
    return s;
}

function padNumber(n, size, padChar)
{
    AssertNumber(n);
    AssertNumber(size);
    AssertString(padChar);
    Assert(padChar.length == 1);

    var s = '' + n;
    Assert((s.length <= size));
    
    if (s.length < size)
        s = pad(s, size, padChar);
    
    AssertString(s);
    Assert((s.length == size));
    
    return s;
}

function pad(s, size, padChar)
{
    AssertString(s);
    AssertString(padChar);
    Assert(padChar.length == 1);

    Assert((s.length <= size));
    
    while (s.length < size)
    {
        s = padChar + s;
    }
    
    AssertString(s);
    Assert((s.length == size));
    
    return s;
}


////////////////////////////////////////////////////////////////////
//
//  Timer System - useful for profiling
//
//
//
//
//
////////////////////////////////////////////////////////////////////




function PlxTimer()
{
     this.duration = 0;
}

PlxTimer.prototype.start = function()
{
    this.duration = -1;
    this.s = new Date();
}

PlxTimer.prototype.stop = function()
{
    this.duration = (new Date()).getTime() - this.s;
}


PlxTimer.prototype.Dump = function(logger, level, label)
{
    if (arguments.length == 1)
        label = "timer: ";
    else
        label = label + ": ";
        
    logger.logLevel(level, label + this.duration + " ms.");
}





////////////////////////////////////////////////////////////////////
//
//  Logging System - kind of a subset of log4j -> just no appenders
//
//
//
//
//
////////////////////////////////////////////////////////////////////


function NullDump(text)
{
}

var gLog = null;
var gLogSys = null;

function PlxLogSysInit(name)
{
    gLogSys = new PlxLogSys();
    gLogSys.init();
    
    gLog = gLogSys.getLogger(name);
}

function PlxLogSys()
{
    this.loggers = {};
}


// XXX - Need to handle the case when the config changes
//       after we are initted by some user Pref panel action
PlxLogSys.prototype.init = function()
{

    var server = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    
    if (server == null)
    {
      // Setup default root logger
      var l = new PlxLogger('.', 'warn');
      this.loggers['.'] = l;
      return;
    }
    
    var lvl = null;
    
    try 
    {
      lvl = server.getIntPref('plaxo.plxLogLevel');
    } catch (ex)
    {
      server.setIntPref('plaxo.plxLogLevel', 2);
      lvl = 2;
    }
    
    if (this.getLevel(lvl) == undefined)
      lvl = 2;
          
    var l = new PlxLogger('.', this.getLevel(lvl));
    this.loggers['.'] = l;
    return;
    

/*
    var f = new PlxFile();
    
    f.name = 'plxlog.cfg';
    
    // Setup default root logger
    var l = new PlxLogger('.', 'warn');
    this.loggers['.'] = l;
    
    
    if (f.exists())
    {
        var lines = f.readLines();
        this.processConfigFile(lines);
    }
    */
}

PlxLogSys.prototype.dump = function()
{
    HardDump("***** Loggers *****");
    for (var o in this.loggers)
    {
        HardDump("***** " + o + " " + this.loggers[o].level);
    }
    HardDump("*******************");
}

PlxLogSys.prototype.levels =
    {
        'debug' :   0,
        'info'  :   1,
        'warn'  :   2,
        'error' :   3,
        'fatal' :   4
    }
    
    

PlxLogSys.prototype.getLevel = function(code)
{
    for (var level in this.levels)
    {
        if (this.levels[level] == code)
          return level;
    }
    
    return undefined;
}

PlxLogSys.prototype.processConfigFile = function(lines)
{
    // Go through the data and process each line
    // rootLogger = LEVEL
    // name.name.name = LEVEL
    
    // XXX add more error checking later
    for (var i = 0; i < lines.length; i++)
    {
        var m = lines[i].match(/^([^#][^=]+)=([\S]+)/);
        
        if (m == null)
            continue;
        
        var name = m[1].toLowerCase();
        var level = m[2].toLowerCase();
        
        if (this.levels[level] == undefined)        // don't allow bad values.
            return;     
        
        if (name == 'rootlogger')
            name = '.';
        HardDump("***** Logcfg: " + name + " level: " + level);
        var l = new PlxLogger(name, level);
        this.loggers[name] = l;
    }
}

PlxLogSys.prototype.getLogger = function(name)
{
    name = name.toLowerCase();
    
    if (this.loggers[name] != undefined)
        return this.loggers[name];
    
    // Ok, we need to create a logger and set it to the 
    // the proper level defined for it. We walk up the hierarchy to find
    var tmp =  name.split('.');
    var l;
    while (true)
    {
        // If none found, use the root, which is guaranteed to be found
        var s = '.';
        if (tmp.length != 0)
            s = tmp.join('.');
            
        if (this.loggers[s] != undefined)
        {
            l = new PlxLogger(name, this.loggers[s].level);
            this.loggers[name] = l;
            break;
        }
        // Slice it down one more namespace
        tmp = tmp.splice(0, tmp.length - 1);
    }
    
    return l;
}

PlxLogSys.prototype.getRootLogger = function()
{
    return this.loggers['.'];
}

PlxLogSys.prototype.log = function(txt)
{
    HardDump('***** ' + txt);
}





function PlxLogger(name, level)
{
     this.name = name.toLowerCase();
     this.level = level.toLowerCase();
     
     if (this.levels[level] > this.levels['error'])
        this.error = NullDump;
     if (this.levels[level] > this.levels['warn'])
        this.warn = NullDump;
     if (this.levels[level] > this.levels['info'])
        this.info = NullDump;
     if (this.levels[level] > this.levels['debug'])
        this.debug = NullDump;
}

PlxLogger.prototype.levels =
    {
        'debug' :   0,
        'info'  :   1,
        'warn'  :   2,
        'error' :   3,
        'fatal' :   4
    }

PlxLogger.prototype.levelFmt =
    {
        'debug' :   'DEBUG ',
        'info'  :   ' INFO ',
        'warn'  :   ' WARN ',
        'error' :   'ERROR ',
        'fatal' :   'FATAL '
    }


PlxLogger.prototype.logLevel = function(level, txt)
{
    level = level.toLowerCase();
    
    if (this.levels[level] == undefined)
        this.log(level + ' - ' + txt)
    else
        this[level](txt);
    /*
    if (this.shouldLog(level))
        HardDump(this.levelFmt[level] + this.name + " - " + txt);
    */
}

PlxLogger.prototype.shouldLog = function(level)
{
    var proposed = this.levels[level];
    var me       = this.levels[this.level];
    
    if (proposed >= me)
        return true;
        
    return false;
}

PlxLogger.prototype.log = function(txt)
{
    HardDump('***** ' + this.name + " - " + txt);
}

PlxLogger.prototype.debug = function(txt)
{
    HardDump(this.levelFmt['debug'] + this.name + " - " + txt);
}

PlxLogger.prototype.info = function(txt)
{
    HardDump(this.levelFmt['info'] + this.name + " - " + txt);
}

PlxLogger.prototype.warn = function(txt)
{
    HardDump(this.levelFmt['warn'] + this.name + " - " + txt);
}

PlxLogger.prototype.error = function(txt)
{
    HardDump(this.levelFmt['error'] + this.name + " - " + txt);
}

PlxLogger.prototype.fatal = function(txt)
{
    HardDump(this.levelFmt['fatal'] + this.name + " - " + txt);
}

