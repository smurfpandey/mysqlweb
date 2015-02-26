var connected = false;
var $tree = $('#database-tree');
var theTable = '';
var theDatabase = '';
var charCollData = [];
var strCharsetOptions = '';
var queryTabCounter = 1;
var dbChildNode = [
  {
    label: 'Table',
    load_on_demand: true,
    type: 'tbl-holder'
  },
  {
    label: 'View',
    load_on_demand: true,
    type: 'vw-holder'
  },
  {
    label: 'Procedure',
    load_on_demand: true,
    type: 'sp-holder'
  },
  {
    label: 'Function',
    load_on_demand: true,
    type: 'fn-holder'
  }
];

function apiCall(method, path, params, cb) {
  $.ajax({
    url: path,
    method: method,
    cache: false,
    data: params,
    success: function(data) {
      cb(data);
    },
    error: function(xhr, status, data) {
      cb(jQuery.parseJSON(xhr.responseText));
    }
  });
}

Handlebars.registerHelper('equal', function(v1, v2, options) {
  if (v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

String.prototype.splice = function(idx, rem, s) {
  return (this.slice(0, idx) + s + this.slice(idx + Math.abs(rem)));
};

function getTableStructure(dbName, tblName, cb) {
  apiCall("get", "databases/" + dbName + "/tables/" + tblName + "/column", {}, cb);
}
function getTablesOfDatabase(dbName, cb) {
  apiCall("get", "/databases/" + dbName + "/tables", {}, cb);
}
function getViewsOfDatabase(dbName, cb) {
  apiCall("get", "/databases/" + dbName + "/views", {}, cb);
}
function getProceduresOfDatabase(dbName, cb) {
  apiCall("get", "/databases/" + dbName + "/procedures", {}, cb);
}
function getFunctionsOfDatabase(dbName, cb) {
  apiCall("get", "/databases/" + dbName + "/functions", {}, cb);
}
function getTableIndexes(table, cb) {
  apiCall("get", "/tables/" + table + "/indexes", {}, cb);
}
function getHistory(cb) {
  apiCall("get", "/history", {}, cb);
}
function getDatabases(cb) {
  apiCall("get", "/databases", {}, cb);
}
function setDefaultDatabase(dbName, cb) {
  apiCall("post", "/databases/" + dbName + "/actions/default", {}, cb);
}
function getProcedureParameters(procedure, dbName, cb) {
  apiCall("get", "/procedures/" + procedure + "/parameters?database=" + dbName, {}, cb);
}
function getAllCollationCharSet(cb) {
  apiCall("get", "/collation", {}, cb);
}
function alterDatabase(dbName, data, cb) {
  apiCall("post", "/databases/" + dbName + "/actions/alter", data, cb);
}
function dropDatabase(dbName, cb) {
  apiCall("delete", "/databases/" + dbName + "/actions/drop", {}, cb);
}
function dropTable(dbName, tblName, cb) {
  apiCall("delete", "/databases/" + dbName + "/tables/" + tblName + "/actions/drop", {}, cb);
}
function getProcDefiniton(dbName, procName, cb) {
  apiCall("get", "/databases/" + dbName + "/procedures/" + procName, {}, cb);
}
function getFuncDefiniton(dbName, funcName, cb) {
  apiCall("get", "/databases/" + dbName + "/functions/" + funcName, {}, cb);
}
function editProcedure(dbName, procName, procDef, cb) {
  apiCall("post", "/databases/" + dbName + "/procedures/" + procName, {
    definition: procDef
  }, cb);
}
function editFunction(dbName, fnName, fnDef, cb) {
  apiCall("post", "/databases/" + dbName + "/functions/" + fnName, {
    definition: fnDef
  }, cb);
}
function getViewDefiniton(dbName, viewName, cb) {
  apiCall("get", "/databases/" + dbName + "/views/" + viewName, {}, cb);
}
function closeConnection(cb) {
  apiCall("delete", "/disconnect", {}, cb);
}


var fnGetSelectedTable = function() {
  return theTable;
};

var fnCreateEditorTab = function(editorName, editorData, editorTitle, objData, executeNow) {
  queryTabCounter++;

  //Create query tab
  generateFromTemplate({
    tab_id: queryTabCounter,
    tab_mode: objData.mode || 'proc',
    tab_title: editorTitle,
    proc_name: objData.proc_name,
    db_name: objData.db_name,
    proc_type: objData.proc_type,
    is_new: objData.is_new
  },
    'tmpl-query-tab', $('#input .tab-content'), false);

  //Create tab button
  var tabBtnHTML = getFromTemplate({
    tab_id: queryTabCounter,
    tab_name: editorName
  }, 'tmpl-query-tab-btn');

  //Insert before this button
  $('#lnkAddQueryTab').parent().before(tabBtnHTML);

  //Initialize the ace editor
  initEditor('query_editor_' + queryTabCounter, editorData);

  $('#query_tab_btn_' + queryTabCounter).tab('show');

  if (executeNow) {
    //Execute now
    $('#query_editor_' + queryTabCounter).next().find('.js-run-query').trigger('click');
  }
};

var fnRemoveNodeInTree = function(nodeName, type) {
  //Get all nodes with name as database name

  var arrFirst = $tree.tree('getNodeByName', nodeName);

  //If we got no nodes, than it's sad
  if (arrFirst.length === 0) {
    return;
  }

  $tree.tree('removeNode', arrFirst);
};

var fnShowTheDatabase = function() {
  //Remove previous one
  $('.selected-db').removeClass('selected-db');

  //Get all nodes with name as database name

  var arrFirst = $tree.tree('getNodesByProperty', 'name', theDatabase);

  //Chances are we might get nodes of type table as well as database
  //Let's apply filter again, this time for type database
  //Just in case
  var myNode = arrFirst.filter(function(el) {
    return el.type == 'database';
  });

  if (myNode.length === 0) {
    return;
  }

  //Apply style to this node
  //Make it bold
  var $nodeEle = $(myNode[0].element);
  $nodeEle.addClass('selected-db');
};

var setNoLoadOnDemand = function(node) {
  $tree.tree(
    'updateNode',
    node,
    {
      load_on_demand: false
    }
  );
};

var showAlterDBPopup = function(nodeName) {
  $('#mdlAlterDB').modal('show');
  $('#dvAlterDBMsg').hide().text('');

  var loadCollation = function(charName) {
    //Get collation for this charset
    var thisObj = _.find(charCollData, function(objData) {
      return objData.character_set === charName;
    });

    var strCollList = '';
    _.each(thisObj.collation, function(val) {
      strCollList += '<option>' + val + '</option>';
    });

    $('#ddlCollList').html(strCollList).selectpicker('refresh');
  };

  if (charCollData.length === 0) {
    //Load all the collation in dropdown
    getAllCollationCharSet(function(data) {
      //data.row.[i][1] = character set
      //data.row.[i][0] = collation


      var filteredData = _.uniq(data.rows, function(val) {
        return val[1];
      });

      var charset = [];
      _.each(filteredData, function(val) {
        charset.push(val[1]);
      });

      charCollData = [];
      //Take one char_set
      _.each(charset, function(charName) {
        var charCollObj = {};
        charCollObj.character_set = charName;
        charCollObj.collation = [];
        var thisCharCollation = _.each(data.rows, function(val) {
          if (val[1] === charName) return charCollObj.collation.push(val[0]);
        });
        charCollData.push(charCollObj);
      });

      charset.forEach(function(val) {
        strCharsetOptions += '<option>' + val + '</option>';
      });

      $('#ddlCharSet').html(strCharsetOptions).selectpicker('refresh');
      loadCollation(charset[0]);
    });
  } else {
    $('#ddlCharSet').html(strCharsetOptions).selectpicker('refresh');
    loadCollation($('#ddlCharSet').val());
  }

  //Set this db in textfield
  $('#db_alter_name').val(nodeName);

  //event listeners for select change
  $('#ddlCharSet').off('change').on('change', function(e) {
    var $this = $(this);
    var selectedCharset = $this.val();

    //Load all the
    loadCollation(selectedCharset);
  });


  $('#btnAlterDatabase').off('click').on('click', function(e) {
    var dbName = $('#db_alter_name').val();
    var charsetName = $('#ddlCharSet').val();
    var collationName = $('#ddlCollList').val();
    var reqData = {
      charset: charsetName,
      collation: collationName
    };

    alterDatabase(dbName, reqData, function(results) {
      if (results.error) {
        //Show erroe mesage
        $('#dvAlterDBMsg').show().text(result.error);
      } else {
        $('#mdlAlterDB').modal('hide');
      }
    });
  });

};

var showDropDBPopup = function(dbName) {
  var $thisModel = $('#mdlDropDB');
  $thisModel.modal('show');

  $('#spDeleteDb').text(dbName);
  $('#db_delete_name').val('');
  $('#dvDropDbMsg').hide().text('');

  $('#btnDropDatabase').off('click').on('click', function(e) {
    //Make sure this confirm dbname is correct
    var confirmDBName = $('#db_delete_name').val();
    var origDBName = $('#spDeleteDb').text();

    if (confirmDBName !== origDBName) {
      return;
    }

    dropDatabase(dbName, function(result) {

      if (typeof (result) === 'undefined') {
        //remove this ndoe from the tree
        fnRemoveNodeInTree(dbName, 'database');
        $thisModel.modal('hide');

        return;
      }

      if (result.error) {
        $('#dvDropDbMsg').show().text(result.error);
        return;
      }
    });
  });
};

var showDropTablePopup = function(tblName, treeNode) {
  var $thisModel = $('#mdlDropTable');
  $thisModel.modal('show');

  var dbName = treeNode.parent.parent.name;

  $('#spDeleteTable').text(tblName);
  $('#tbl_delete_name').val('');
  $('#dvDropTableMsg').hide().text('');

  $('#btnDropTable').off('click').on('click', function(e) {
    //Make sure this confirm dbname is correct
    var confirmTblName = $('#tbl_delete_name').val();
    var origTblName = $('#spDeleteTable').text();

    if (confirmTblName !== origTblName) {
      return;
    }

    dropTable(dbName, tblName, function(result) {

      if (typeof (result) === 'undefined') {
        //remove this ndoe from the tree
        fnRemoveNodeInTree(tblName, 'table');
        $thisModel.modal('hide');

        return;
      }

      if (result.error) {
        $('#dvDropTableMsg').show().text(result.error);
        return;
      }
    });
  });
};

var showCreateTablePopup = function(treeNode) {
  var $thisModel = $('#mdlCreateTable');
  $thisModel.modal('show');

  var dbName = treeNode.parent.parent.name;
};

var showEditProcedure = function(procName, treeNode) {
  var dbName = treeNode.parent.parent.name;

  getProcDefiniton(dbName, procName, function(data) {
    if (data.error) {
      //show error
      swal({
        title: "Error!",
        text: data.error,
        type: "error",
        confirmButtonText: "Ohho!"
      });
      return;
    }

    var procText = data.rows[0][2];

    fnCreateEditorTab(dbName + '.' + procName, procText, procName, {
      proc_name: procName,
      db_name: dbName,
      proc_type: 'PROC'
    });
  });
};

var showEditFunction = function(funcName, treeNode) {
  var dbName = treeNode.parent.parent.name;

  getFuncDefiniton(dbName, funcName, function(data) {
    if (data.error) {
      //show error
      return;
    }

    var procText = data.rows[0][2];

    fnCreateEditorTab(dbName + '.' + funcName, procText, funcName, {
      proc_name: funcName,
      db_name: dbName,
      proc_type: 'FUNC'
    });
  });
};

var showEditView = function(viewName, treeNode) {
  var dbName = treeNode.parent.parent.name;

  getViewDefiniton(dbName, viewName, function(data) {
    if (data.error) {
      //show error
      return;
    }

    var procText = data.rows[0][1];

    fnCreateEditorTab(dbName + '.' + viewName, procText, viewName, {
      proc_name: viewName,
      db_name: dbName,
      proc_type: 'VIEW'
    });
  });
};

var fnGetProcName = function(procText) {
  //Get start point
  var startIndex = 17;

  var mehProc = procText.toLowerCase();
  if (mehProc.indexOf('create function') > -1) {
    startIndex = 16;
  }

  var lastIndex = procText.indexOf('('); //30

  var procLength = lastIndex - startIndex;

  var procName = procText.substring(startIndex, lastIndex);

  return $.trim(procName);

};

var showCreateProcedure = function(dbName) {

  var procDef = 'CREATE PROCEDURE new_procedure()';
  procDef += '\r\n';
  procDef += 'BEGIN';
  procDef += '\r\n';
  procDef += '\r\n';
  procDef += 'END';

  var procName = 'new_procedure';

  fnCreateEditorTab(dbName + '.' + procName, procDef, procName, {
    proc_name: procName,
    db_name: dbName,
    proc_type: 'PROC',
    is_new: true
  });
};

var showCreateFunction = function(dbName) {
  var procDef = 'CREATE FUNCTION new_function()';
  procDef += '\r\n';
  procDef += 'RETURNS INTEGER';
  procDef += '\r\n';
  procDef += 'BEGIN';
  procDef += '\r\n';
  procDef += '\r\n';
  procDef += 'RETURN 1;';
  procDef += '\r\n';
  procDef += 'END';

  var procName = 'new_function';

  fnCreateEditorTab(dbName + '.' + procName, procDef, procName, {
    proc_name: procName,
    db_name: dbName,
    proc_type: 'FUNC',
    is_new: true
  });
};

var fnSetDefaultDatabase = function(dbName) {
  theDatabase = dbName;
  setDefaultDatabase(dbName, function() {
    //Highglight this database node
    fnShowTheDatabase();
  });
};

function loadDatabases() {
  getDatabases(function(data) {
    //generateFromTemplate({database: data}, 'tmpl-database-tree', $('#database-tree'), true);
    var objData = [];

    data.forEach(function(val) {
      objData.push({
        label: val,
        type: 'database',
        children: dbChildNode
      });
    });

    //Check if the tree alreay exists
    var thisTree = $('#database-tree').data('simple_widget_tree');

    if (typeof (thisTree) === 'object') {
      //Just load data
      $('#database-tree').tree('loadData', objData);
    } else {
      $('#database-tree').empty();
      //Make a jsTree
      $('#database-tree').tree({
        data: objData
      });

      forTheTree();
    }



    //Highlisht the selected database, if any
    fnShowTheDatabase();
  });
}

var fnRetrieveTableData = function(tblName, treeNode) {
  var dbName = treeNode.parent.parent.name;

  var selectQuery = 'SELECT * FROM ' + dbName + '.' + tblName + ' LIMIT 1000;';

  fnCreateEditorTab(dbName + '.' + tblName, selectQuery, tblName, {
    proc_name: tblName,
    db_name: dbName,
    proc_type: 'QUERY',
    is_new: true,
    mode: 'tbl'
  }, true);
};

function forTheTree() {
  $('#database-tree').bind('tree.toggle', function(e) {
    var dbNode = e.node;
    var dbName = dbNode.parent.name;

    //If data is already loaded, just do nothing.
    //It's all taken care of.
    if (dbNode.data_loaded) {
      return;
    }

    if (dbNode.type === 'tbl-holder') {
      getTablesOfDatabase(dbName, function(data) {
        var objData = [];

        if (data === null) {
          console.log('No tables in database: ' + dbName);
          setNoLoadOnDemand(dbNode);
          return;
        }

        data.forEach(function(val) {
          objData.push({
            label: val,
            type: 'table',
            load_on_demand: true
          });
        });

        $tree.tree('loadData', objData, dbNode);
        $tree.tree('updateNode', dbNode, {
          data_loaded: true,
        });
        $tree.tree('openNode', dbNode);
      });
    } else if (dbNode.type === 'vw-holder') {
      getViewsOfDatabase(dbName, function(data) {
        var objData = [];

        if (data === null) {
          console.log('No procedures in database: ' + dbName);
          setNoLoadOnDemand(dbNode);
          return;
        }

        data.forEach(function(val) {
          objData.push({
            label: val,
            type: 'view',
            load_on_demand: false
          });
        });

        $tree.tree('loadData', objData, dbNode);
        $tree.tree('updateNode', dbNode, {
          data_loaded: true,
        });
        $tree.tree('openNode', dbNode);
      });
    } else if (dbNode.type === 'sp-holder') {
      getProceduresOfDatabase(dbName, function(data) {
        var objData = [];

        if (data === null) {
          console.log('No procedures in database: ' + dbName);
          setNoLoadOnDemand(dbNode);
          return;
        }

        data.forEach(function(val) {
          objData.push({
            label: val,
            type: 'procedure',
            load_on_demand: true
          });
        });

        $tree.tree('loadData', objData, dbNode);
        $tree.tree('updateNode', dbNode, {
          data_loaded: true,
        });
        $tree.tree('openNode', dbNode);
      });
    } else if (dbNode.type === 'fn-holder') {
      getFunctionsOfDatabase(dbName, function(data) {
        var objData = [];

        if (data === null) {
          console.log('No functions in database: ' + dbName);
          setNoLoadOnDemand(dbNode);
          return;
        }

        data.forEach(function(val) {
          objData.push({
            label: val,
            type: 'function',
            load_on_demand: true
          });
        });

        $tree.tree('loadData', objData, dbNode);
        $tree.tree('updateNode', dbNode, {
          data_loaded: true,
        });
        $tree.tree('openNode', dbNode);
      });
    } else if (dbNode.type === 'table') {
      var tblName = dbNode.name;
      dbName = dbNode.parent.parent.name;
      getTableStructure(dbName, tblName, function(data) {
        var objData = [];

        if (data.rows === null) {
          console.log('No columns in table: ' + tblName);
          setNoLoadOnDemand(dbNode);
          return;
        }

        data.rows.forEach(function(val) {
          objData.push({
            label: val[0] + ' (' + val[1] + ')',
            type: 'column'
          });
        });

        $tree.tree('loadData', objData, dbNode);
        $tree.tree('updateNode', dbNode, {
          data_loaded: true,
        });
        $tree.tree('openNode', dbNode);
      });
    } else if (dbNode.type === 'procedure' ||
      dbNode.type === 'function') {
      var procName = dbNode.name;
      dbName = dbNode.parent.parent.name;

      getProcedureParameters(procName, dbName, function(data) {
        var objData = [];

        if (data.rows === null) {
          console.log('No parameter in procedure: ' + procName);
          setNoLoadOnDemand(dbNode);
          return;
        }

        data.rows.forEach(function(val) {

          var ordinalPos = parseInt(val[3], 10);
          var paramText = '';
          if (ordinalPos === 0) {
            paramText = 'returns ' + val[2];
          } else {
            paramText = val[0] + '- ' + val[1] + ' -' + val[2];
          }
          objData.push({
            label: paramText,
            type: 'parameter'
          });
        });

        $tree.tree('loadData', objData, dbNode);
        $tree.tree('updateNode', dbNode, {
          data_loaded: true,
        });
        $tree.tree('openNode', dbNode);
      });
    }
  });

  $('#database-tree').bind('tree.click', function(e) {
    var dbNode = e.node;
    var nodeName = dbNode.name;

    if (dbNode.type === 'table') {
      theTable = nodeName;
      $('li.jqtree_common.active').removeClass('active');
      $(dbNode.element).addClass('active');
    }

    e.preventDefault();
  });

  //Double click on a database node, to set it as default
  //tree.dblclick
  $tree.on('tree.dblclick', function(e) {
    e.preventDefault();

    var dbNode = e.node;

    if (dbNode.type === 'database') {

      //Set this as default database
      fnSetDefaultDatabase(dbNode.name);
    }

  });

  //Listen when data is refreshed inside the tree
  $tree.on('tree.refresh', function(e) {
    fnShowTheDatabase();
  });
  $tree.on('tree.open', function(e) {
    fnShowTheDatabase();
  });

  var menuArray = [
    {
      type: 'table',
      menu_element: $('#tblMenu')
    },
    {
      type: 'database',
      menu_element: $('#dbMenu')
    },
    {
      type: 'procedure',
      menu_element: $('#spMenu')
    },
    {
      type: 'function',
      menu_element: $('#fnMenu')
    },
    {
      type: 'view',
      menu_element: $('#vwMenu')
    }
  ];

  $tree.jqTreeContextMenu(menuArray, {
    "edit": function(node) {
      alert('Edit node: ' + node.name);
    },
    "default-db": function(node) {
      fnSetDefaultDatabase(node.name);
    },
    "alter-db": function(node) {
      showAlterDBPopup(node.name);
    },
    "drop-db": function(node) {
      showDropDBPopup(node.name);
    },
    "drop-tbl": function(node) {
      showDropTablePopup(node.name, node);
    },
    "edit-sp": function(node) {
      showEditProcedure(node.name, node);
    },
    "edit-fn": function(node) {
      showEditFunction(node.name, node);
    },
    "create-sp": function(node) {
      showCreateProcedure(node.name);
    },
    "create-fn": function(node) {
      showCreateFunction(node.name);
    },
    "edit-vw": function(node) {
      showEditView(node.name, node);
    },
    "refresh-all": function(node) {
      loadDatabases();
    },
    "select-tbl": function(node) {
      fnRetrieveTableData(node.name, node);
    }
  });
}



function executeQuery(query, cb) {
  apiCall("post", "/query", {
    query: query
  }, cb);
}

function explainQuery(query, cb) {
  apiCall("post", "/explain", {
    query: query
  }, cb);
}

function escapeHtml(str) {
  if (str !== null || str !== undefined) {
    return jQuery("<div/>").text(str).html();
  }

  return "<span class='null'>null</span>";
}

function unescapeHtml(str) {
  var e = document.createElement("div");
  e.innerHTML = str;
  return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

function resetTable() {
  $("#results").
    attr("data-mode", "").
    text("").
    removeClass("empty").
    removeClass("no-crop");
}

function buildTable(results) {
  resetTable();

  if (results.error) {
    $("<tr><td>ERROR: " + results.error + "</tr></tr>").appendTo("#results");
    $("#results").addClass("empty");
    return;
  }

  if (!results.rows) {
    $("<tr><td>No records found</tr></tr>").appendTo("#results");
    $("#results").addClass("empty");
    return;
  }

  var cols = "";
  var rows = "";

  results.columns.forEach(function(col) {
    cols += "<th data='" + col + "'>" + col + "</th>";
  });

  results.rows.forEach(function(row) {
    var r = "";
    for (var i in row) {
      r += "<td><div>" + escapeHtml(row[i]) + "</div></td>";
    }
    rows += "<tr>" + r + "</tr>";
  });

  $("<thead>" + cols + "</thead><tbody>" + rows + "</tobdy>").appendTo("#results");
}

function setCurrentTab(id) {
  $("#nav ul li.selected").removeClass("selected");
  $("#" + id).addClass("selected");
}

function showQueryHistory() {
  getHistory(function(data) {
    var rows = [];

    for (var i in data) {
      rows.unshift([parseInt(i) + 1, data[i]]);
    }

    buildTable({
      columns: ["id", "query"],
      rows: rows
    });

    setCurrentTab("table_history");
    $("#input").hide();
    $("#output").addClass("full");
    $("#results").addClass("no-crop");
  });
}

function showTableIndexes() {
  var name = fnGetSelectedTable();

  if (name.length === 0) {
    alert("Please select a table!");
    return;
  }

  getTableIndexes(name, function(data) {
    setCurrentTab("table_indexes");
    buildTable(data);

    $("#input").hide();
    $("#output").addClass("full");
    $("#results").addClass("no-crop");
  });
}

function showTableInfo() {
  var name = fnGetSelectedTable();

  if (name.length === 0) {
    alert("Please select a table!");
    return;
  }

  apiCall("get", "/tables/" + name + "/info", {}, function(data) {
    $(".table-information ul").show();
    $("#table_total_size").text(data.total_size);
    $("#table_data_size").text(data.data_size);
    $("#table_index_size").text(data.index_size);
    $("#table_rows_count").text(data.rows_count);
    $("#table_encoding").text("Unknown");
  });
}

function showTableContent() {
  var name = fnGetSelectedTable();

  if (name.length === 0) {
    alert("Please select a table!");
    return;
  }

  var query = "SELECT * FROM " + name + " LIMIT 100;";

  executeQuery(query, function(data) {
    buildTable(data);
    setCurrentTab("table_content");

    $("#results").attr("data-mode", "browse");
    $("#input").hide();
    $("#output").addClass("full");
  });
}

function showTableStructure() {
  var name = fnGetSelectedTable();

  if (name.length === 0) {
    alert("Please select a table!");
    return;
  }

  getTableStructure(name, function(data) {
    setCurrentTab("table_structure");
    buildTable(data);
  });
}

function showQueryPanel(editor) {
  setCurrentTab("table_query");
  editor.focus();

  $("#input").show();
  $("#output").removeClass("full");
}

function showConnectionPanel() {
  setCurrentTab("table_connection");

  apiCall("get", "/info", {}, function(data) {
    var rows = [];

    for (var key in data) {
      rows.push([key, data[key]]);
    }

    buildTable({
      columns: ["attribute", "value"],
      rows: rows
    });

    $("#input").hide();
    $("#output").addClass("full");
  });
}

function runQuery(editor) {
  setCurrentTab("table_query");

  $("#query_progress").show();

  var query = ''; //$.trim(editor.getValue());

  //Check if text is selected.
  //If yes, then execute that selectionm only;

  var selectedText = editor.session.getTextRange(editor.getSelectionRange());

  if (selectedText.length > 0) {
    query = selectedText;
  }

  if (query.length === 0) {
    $("#query_progress").hide();
    return;
  }

  executeQuery(query, function(data) {
    buildTable(data);

    $("#query_progress").hide();
    $("#input").show();
    $("#output").removeClass("full");

    if (query.toLowerCase().indexOf("explain") != -1) {
      $("#results").addClass("no-crop");
    }
  });
}

function runExplain(editor) {
  setCurrentTab("table_query");

  $("#query_progress").show();

  var query = $.trim(editor.getValue());

  if (query.length === 0) {
    $("#query_progress").hide();
    return;
  }

  explainQuery(query, function(data) {
    buildTable(data);

    $("#query_progress").hide();
    $("#input").show();
    $("#output").removeClass("full");
    $("#results").addClass("no-crop");
  });
}

function exportToCSV(editor) {
  var query = $.trim(editor.getValue());

  if (query.length === 0) {
    return;
  }

  // Replace line breaks with spaces and properly encode query
  query = window.encodeURI(query.replace(/\n/g, " "));

  var url = "http://" + window.location.host + "/query?format=csv&query=" + query;
  var win = window.open(url, '_blank');

  setCurrentTab("table_query");
  win.focus();
}

function initEditor(editorId, editorData) {
  var editor = ace.edit(editorId);

  $('#' + editorId).data('ace-editor', editor);

  editor.getSession().setMode("ace/mode/mysql");
  editor.getSession().setTabSize(2);
  editor.getSession().setUseSoftTabs(true);
  editor.commands.addCommands([{
    name: "run_query",
    bindKey: {
      win: "Ctrl-Enter",
      mac: "Command-Enter"
    },
    exec: function(editor) {
      runQuery(editor);
    }
    }, {
    name: "explain_query",
    bindKey: {
      win: "Ctrl-E",
      mac: "Command-E"
    },
    exec: function(editor) {
      runExplain(editor);
    }
  }]);

  if (editorData) {
    editor.insert(editorData);
  }
}

function addShortcutTooltips() {
  if (navigator.userAgent.indexOf("OS X") > 0) {
    $("#run").attr("title", "Shortcut: ⌘+Enter");
    $("#explain").attr("title", "Shortcut: ⌘+E");
  } else {
    $("#run").attr("title", "Shortcut: Ctrl+Enter");
    $("#explain").attr("title", "Shortcut: Ctrl+E");
  }
}

function showConnectionSettings() {
  $("#connection_window").show();
  $('#pg_password').hidePassword(true);
}

function getConnectionString() {
  var url = $.trim($("#connection_url").val());
  var mode = $(".connection-group-switch button.active").attr("data");
  var ssl = $("#connection_ssl").val();

  if (mode == "standard") {
    var host = $("#pg_host").val();
    var port = $("#pg_port").val();
    var user = $("#pg_user").val();
    var pass = $("#pg_password").val();
    var db = $("#pg_db").val();

    if (port.length === 0) {
      port = "3306";
    }
    if (db.length > 0) {
      theDatabase = db;
    }

    url = user + ":" + pass + "@tcp(" + host + ":" + port + ")/" + db;
  } else {
    if (url.indexOf("localhost") != -1 && url.indexOf("sslmode") == -1) {
      //url += "?sslmode=" + ssl;
    }
  }

  return url;
}

function getFromTemplate(objData, templateId) {
  var source = $("#" + templateId).html();
  var template = Handlebars.compile(source);
  var html = template(objData);

  return html;
}

function generateFromTemplate(objData, templateId, $destContainer, iReplace) {
  var html = getFromTemplate(objData, templateId);

  if (iReplace) {
    $destContainer.html(html);
  } else {
    $destContainer.append(html);
  }
}

function initModals() {
  $('#mdlAlterDB').modal({
    show: false
  });

  $('.js-myModal').modal({
    backdrop: 'static',
    show: false
  });
}

$(document).ready(function() {
  $("#table_content").on("click", function() {
    showTableContent();
  });
  $("#table_structure").on("click", function() {
    showTableStructure();
  });
  $("#table_indexes").on("click", function() {
    showTableIndexes();
  });
  $("#table_history").on("click", function() {
    showQueryHistory();
  });
  $("#table_query").on("click", function() {
    showQueryPanel();
  });
  $("#table_connection").on("click", function() {
    showConnectionPanel();
  });

  $('#body').on('click', '.js-run-query', function() {
    var $editor = $(this).parent().prev();
    var editor = $editor.data('ace-editor');

    runQuery(editor);
  });

  $('#body').on('click', '.js-explain-query', function() {
    var $editor = $(this).parent().prev();
    var editor = $editor.data('ace-editor');

    runExplain(editor);
  });

  $("#csv").on("click", function() {
    exportToCSV();
  });

  $("#results").on("click", "tr", function() {
    $("#results tr.selected").removeClass();
    $(this).addClass("selected");
  });

  $("#results").on("dblclick", "td > div", function() {
    if ($(this).has("textarea").length > 0) {
      return;
    }

    var value = unescapeHtml($(this).html());
    if (!value) {
      return;
    }

    var textarea = $("<textarea />").
      text(value).
      addClass("form-control").
      css("width", $(this).css("width"));

    if (value.split("\n").length >= 3) {
      textarea.css("height", "200px");
    }

    $(this).html(textarea).css("max-height", "200px");
  });

  $("#tables").on("click", "li", function() {
    $("#tables li.selected").removeClass("selected");
    $(this).addClass("selected");
    showTableContent();
    showTableInfo();
  });

  $("#close_connection").on("click", function() {
    if (connected) {
      closeConnection(function(data) {
        if (typeof (data) === 'undefined') {
          connected = false;
          showConnectionSettings();
          return;
        }

        if (data.error) {
          swal({
            title: "Error!",
            text: data.error,
            type: "error",
            confirmButtonText: "Kool"
          });
        } else {

        }
      });
    }
  });

  $("#close_connection_window").on("click", function() {
    $("#connection_window").hide();
  });

  $("#connection_url").on("change", function() {
    if ($(this).val().indexOf("localhost") != -1) {
      $("#connection_ssl").val("disable");
    }
  });

  $("#pg_host").on("change", function() {
    if ($(this).val().indexOf("localhost") != -1) {
      $("#connection_ssl").val("disable");
    }
  });

  $(".connection-group-switch button").on("click", function() {
    $(".connection-group-switch button").removeClass("active");
    $(this).addClass("active");

    switch ($(this).attr("data")) {
      case "scheme":
        $(".connection-scheme-group").show();
        $(".connection-standard-group").hide();
        return;
      case "standard":
        $(".connection-scheme-group").hide();
        $(".connection-standard-group").show();
        $(".connection-ssh-group").hide();
        return;
      case "ssh":
        $(".connection-scheme-group").hide();
        $(".connection-standard-group").show();
        $(".connection-ssh-group").show();
        return;
    }
  });

  $("#connection_form").on("submit", function(e) {
    e.preventDefault();

    var button = $(this).children("button");
    var url = getConnectionString();

    if (url.length === 0) {
      return;
    }

    $("#connection_error").hide();
    button.prop("disabled", true).text("Please wait...");

    apiCall("post", "/connect", {
      url: url
    }, function(resp) {
        button.prop("disabled", false).text("Connect");

        if (resp.error) {
          connected = false;
          $("#connection_error").text(resp.error).show();
        } else {
          connected = true;
          $("#connection_window").hide();
          loadDatabases();
          $("#main").show();
        }
      });
  });

  $('#lnkAddQueryTab').on('click', function(e) {
    queryTabCounter++;

    //Create query tab
    generateFromTemplate({
      tab_id: queryTabCounter
    }, 'tmpl-query-tab', $('#input .tab-content'), false);

    //Create tab button
    var tabBtnHTML = getFromTemplate({
      tab_id: queryTabCounter
    }, 'tmpl-query-tab-btn');

    //Insert before this button
    $(this).parent().before(tabBtnHTML);

    //Initialize the ace editor
    initEditor('query_editor_' + queryTabCounter);

    e.preventDefault();
  });

  $('#input').on('click', '.close-query-tab', function(e) {
    //Get the tab div of this
    var $tabButton = $(this).parent();
    var tabId = $tabButton.attr('href').substr(1);
    var $tabDiv = $('#' + tabId);
    var $tabEditor = $tabDiv.find('.query-editor');

    //Get editor of this tab
    var tabEditor = $tabEditor.data('ace-editor');

    //Destory the editor: Free memory
    tabEditor.destroy();

    //Make previous tab active, if this tab is active
    var isActive = $tabButton.parent().hasClass('active');
    if (isActive) {
      var $prevTab = $tabButton.parent().prev().find('a');
      $prevTab.tab('show');
    }

    //Remove the tab from DOM
    $tabDiv.remove();

    //Remove the tab button from DOM
    $tabButton.parent().remove();
  });

  $('#input').on('click', '.js-apply-proc', function(e) {
    var $thisQueryDiv = $(this).parent().prev();

    var thisEditor = $thisQueryDiv.data('ace-editor');
    var procDef = $.trim(thisEditor.getValue());

    var procName = $thisQueryDiv.data('procname');
    var dbName = $thisQueryDiv.data('dbname');

    var procType = $(this).data('proctype');

    //if new procedure, get procedure name from proc text
    var isNewProc = $thisQueryDiv.data('isnew');

    if (isNewProc === true) {
      procName = fnGetProcName(procDef);
      $thisQueryDiv.data('procname', procName);
    }

    switch (procType) {
      case "PROC": {
        editProcedure(dbName, procName, procDef, function(data) {
          if (data.error) {
            swal({
              title: "Error!",
              text: data.error,
              type: "error",
              confirmButtonText: "Cool"
            });
          } else {
            swal({
              title: "Nice!",
              text: "Procedure saved successfully",
              type: "success",
              confirmButtonText: "Cool"
            });

            $thisQueryDiv.data('isnew', false);
          }
        });
        break;
      }
      case "FUNC": {
        editFunction(dbName, procName, procDef, function(data) {
          if (data.error) {
            swal({
              title: "Error!",
              text: data.error,
              type: "error",
              confirmButtonText: "Cool"
            });
          } else {
            swal({
              title: "Nice!",
              text: "Procedure saved successfully",
              type: "success",
              confirmButtonText: "Cool"
            });

            $thisQueryDiv.data('isnew', false);
          }
        });
        break;
      }
    }


  });

  $('#refresh-list').on('click', function(e) {
    loadDatabases();
  });

  initModals();

  initEditor("custom_query");
  addShortcutTooltips();

  $(document).ajaxStart($.blockUI).ajaxStop($.unblockUI);

  apiCall("get", "/info", {}, function(resp) {
    if (resp.error) {
      connected = false;
      showConnectionSettings();
    } else {
      connected = true;
      theDatabase = resp['DATABASE()'];
      loadDatabases();
      $("#main").show();
    }
  });
});
