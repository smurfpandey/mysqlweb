package main

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"reflect"

	"github.com/jmoiron/sqlx"
	"github.com/nu7hatch/gouuid"
)

//Client is our SQL client
type Client struct {
	db      *sqlx.DB
	history []string
	host    string
	user    string
}

//Row will hold rows of our SQL table
type Row []interface{}

//Result will hold our SQL query resultset
type Result struct {
	Columns []string `json:"columns"`
	Rows    []Row    `json:"rows"`
}

//NewClientFromURL will create a new mysql client using the URL provided in parameters
func NewClientFromURL(url string) (string, error) {

	db, err := sqlx.Open("mysql", url)

	if err != nil {
		return "", err
	}

	user, host, _, _ := getConnParametersFromString(url)

	u4, err := uuid.NewV4()
	if err != nil {
		return "", err
	}

	strUuid := u4.String()

	dbClientMap[strUuid] = &Client{db: db, host: host, user: user}

	return strUuid, nil
}

//Close disconnects a existing connection
func (client *Client) Close() error {
	//Clear history
	client.history = nil
	client.host = ""
	client.user = ""
	return client.db.Close()
}

//Test if we have a working connection with the database
func (client *Client) Test() error {
	return client.db.Ping()
}

func (client *Client) recordQuery(query string) {
	client.history = append(client.history, query)
}

//Info of our connected database
func (client *Client) Info() (*Result, error) {
	return client.Query(MySQLInfo)
}

//Databases will list all the databases in the system
func (client *Client) Databases() ([]string, error) {
	res, err := client.Query(MySQLDatabases)

	if err != nil {
		return nil, err
	}

	var tables []string

	for _, row := range res.Rows {
		tables = append(tables, row[0].(string))
	}

	return tables, nil
}

//DatabaseTables will give you list of tables belonging to the database
func (client *Client) DatabaseTables(database string) ([]string, error) {
	res, err := client.Query(fmt.Sprintf(MySQLDatabaseTables, database))

	if err != nil {
		return nil, err
	}

	var tables []string

	for _, row := range res.Rows {
		tables = append(tables, row[0].(string))
	}

	return tables, nil
}

//DatabaseViews will give you list of views belonging to the database
func (client *Client) DatabaseViews(database string) ([]string, error) {
	res, err := client.Query(fmt.Sprintf(MySQLDatabaseViews, database))

	if err != nil {
		return nil, err
	}

	var tables []string

	for _, row := range res.Rows {
		tables = append(tables, row[0].(string))
	}

	return tables, nil
}

//DatabaseProcedures returns a list of all the stored procedures in the database
func (client *Client) DatabaseProcedures(database string) ([]string, error) {
	res, err := client.Query(fmt.Sprintf(MySQLDatabaseProcedures, database))

	if err != nil {
		return nil, err
	}

	var tables []string

	for _, row := range res.Rows {
		tables = append(tables, row[0].(string))
	}

	return tables, nil
}

//DatabaseFunctions returns a list of all the functions in the database
func (client *Client) DatabaseFunctions(database string) ([]string, error) {
	res, err := client.Query(fmt.Sprintf(MySQLDatabaseFunctions, database))

	if err != nil {
		return nil, err
	}

	var tables []string

	for _, row := range res.Rows {
		tables = append(tables, row[0].(string))
	}

	return tables, nil
}

//TableInfo will return info like data used, row count etc.
func (client *Client) TableInfo(table string) (*Result, error) {
	return client.Query(fmt.Sprintf(MySQLTableInfo, table))
}

//TableIndexes returns all the indexes of the table
func (client *Client) TableIndexes(table string) (*Result, error) {
	res, err := client.Query(fmt.Sprintf(MySQLTableIndexs, table))

	if err != nil {
		return nil, err
	}

	return res, err
}

func (client *Client) TableColumns(database string, table string) (*Result, error) {
	res, err := client.Query(fmt.Sprintf(MySQLTableColumns, database, table))

	if err != nil {
		return nil, err
	}

	return res, err
}

//ProcedureParameters returns all the paramaters of a stored procedure
func (client *Client) ProcedureParameters(procedure string, database string) (*Result, error) {
	res, err := client.Query(fmt.Sprintf(MySQLProcedureParameters, procedure, database))

	if err != nil {
		return nil, err
	}

	return res, err
}

//DatabaseCollationCharSet returns all the collation and character sets in db
func (client *Client) DatabaseCollationCharSet() (*Result, error) {
	res, err := client.Query(MySQLAllCollationCharSet)

	if err != nil {
		return nil, err
	}

	return res, err
}

//AlterDatabase let's you set character set & collation of the database
func (client *Client) AlterDatabase(database string, charset string, collation string) (*Result, error) {
	res, err := client.Query(fmt.Sprintf(MySQLDatabaseAlter, database, charset, collation))

	if err != nil {
		return nil, err
	}

	return res, err
}

//DropDatabase will drop the database from the system
func (client *Client) DropDatabase(database string) (*Result, error) {
	res, err := client.Query(fmt.Sprintf(MySQLDatabaseDrop, database))

	if err != nil {
		return nil, err
	}

	return res, err
}

//DropTable will drop the table from selected database
func (client *Client) DropTable(database string, table string) (*Result, error) {
	res, err := client.Query(fmt.Sprintf(MySQLTableDrop, database, table))

	if err != nil {
		return nil, err
	}

	return res, err
}

//TruncateTable will truncate the table
func (client *Client) TruncateTable(database string, table string) (*Result, error) {
	res, err := client.Query(fmt.Sprintf(MySQLTableTruncate, database, table))

	if err != nil {
		return nil, err
	}

	return res, err
}

//ProcedureDefinition will give you the create statement of procedure/function
func (client *Client) ProcedureDefinition(procType string, database string, name string) (*Result, error) {
	res, err := client.Query(fmt.Sprintf(MySQLProcedureDefinition, procType, database, name))

	if err != nil {
		return nil, err
	}

	return res, err
}

func (client *Client) DropProcedure(procType string, database string, name string) (bool, error) {
	_, err := client.Execute(fmt.Sprintf(MySQLProcedureDrop, procType, database, name))

	if err != nil {
		return false, err
	}

	return true, err
}

func (client *Client) ProcedureCreate(procType string, database string, name string, definition string) (bool, error) {
	trans, err := client.db.Begin()

	if err != nil {
		return false, err
	}

	//set this as default database
	_, err = trans.Exec(fmt.Sprintf("use %s;", database))

	//Drop existing procedure
	_, err = trans.Exec(fmt.Sprintf(MySQLProcedureDrop, procType, database, name))

	if err != nil {
		return false, err
	}

	//Create new definition
	//yoIndex := 10
	//if procType == "FUNCTION" {
	//	yoIndex = 9
	//}
	//mehIndex := strings.Index(definition, procType+" `")
	//newDef := splice(definition, mehIndex+yoIndex, 0, "`"+database+"`.")

	_, err = trans.Exec(definition)

	if err != nil {
		return false, err
	}

	return true, nil
}

func (client *Client) ViewDefinition(database string, name string) (*Result, error) {
	res, err := client.Query(fmt.Sprintf(MySQLViewDefinition, database, name))

	if err != nil {
		return nil, err
	}

	return res, err
}

func (client *Client) Search(query string) (*Result, error) {
	//Search in table list
	resTbl, err := client.Query(fmt.Sprintf(MySQLSearchTable, query))

	if err != nil {
		return nil, err
	}

	resProc, err := client.Query(fmt.Sprintf(MySQLSearchProcedure, query))

	if err != nil {
		return nil, err
	}

	resFunc, err := client.Query(fmt.Sprintf(MySQLSearchFunction, query))

	if err != nil {
		return nil, err
	}

	resMerge := Result{
		Columns: resTbl.Columns,
		Rows:    append(resTbl.Rows, resProc.Rows...),
	}

	resMerge.Rows = append(resMerge.Rows, resFunc.Rows...)

	return &resMerge, err
}

//Query will execute the sql query passed as parameter, and return the resultset
func (client *Client) Query(query string) (*Result, error) {
	rows, err := client.db.Queryx(query)

	client.recordQuery(query)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	cols, err := rows.Columns()

	if err != nil {
		return nil, err
	}

	result := Result{
		Columns: cols,
	}

	for rows.Next() {
		obj, err := rows.SliceScan()

		for i, item := range obj {
			if item == nil {
				obj[i] = nil
			} else {
				t := reflect.TypeOf(item).Kind().String()

				if t == "slice" {
					obj[i] = string(item.([]byte))
				}
			}
		}

		if err == nil {
			result.Rows = append(result.Rows, obj)
		}
	}

	return &result, nil
}

func (client *Client) Execute(query string) (int64, error) {
	res, err := client.db.Exec(query)

	if err != nil {
		return -1, err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return -1, err
	}

	return rowsAffected, nil
}

//Format the resultset
func (res *Result) Format() []map[string]interface{} {
	var items []map[string]interface{}

	for _, row := range res.Rows {
		item := make(map[string]interface{})

		for i, c := range res.Columns {
			item[c] = row[i]
		}

		items = append(items, item)
	}

	return items
}

//CSV will format the sql resultset as CSV
func (res *Result) CSV() []byte {
	buff := &bytes.Buffer{}
	writer := csv.NewWriter(buff)

	writer.Write(res.Columns)

	for _, row := range res.Rows {
		record := make([]string, len(res.Columns))

		for i, item := range row {
			if item != nil {
				record[i] = fmt.Sprintf("%v", item)
			} else {
				record[i] = ""
			}
		}

		err := writer.Write(record)

		if err != nil {
			fmt.Println(err)
			break
		}
	}

	writer.Flush()
	return buff.Bytes()
}
