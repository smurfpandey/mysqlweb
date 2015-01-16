package main

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"reflect"

	"github.com/jmoiron/sqlx"
)

//Client is our SQL client
type Client struct {
	db      *sqlx.DB
	history []string
}

//Row will hold rows of our SQL table
type Row []interface{}

//Result will hold our SQL query resultset
type Result struct {
	Columns []string `json:"columns"`
	Rows    []Row    `json:"rows"`
}

//NewClient will create a new client
func NewClient() (*Client, error) {
	db, err := sqlx.Open("mysql", getConnectionString())

	if err != nil {
		return nil, err
	}

	return &Client{db: db}, nil
}

//NewClientFromURL will create a new mysql client using the URL provided in parameters
func NewClientFromURL(url string) (*Client, error) {
	fmt.Println(url)
	db, err := sqlx.Open("mysql", url)

	if err != nil {
		return nil, err
	}

	return &Client{db: db}, nil
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

//Tables will return list of tables in test database
func (client *Client) Tables() ([]string, error) {
	res, err := client.Query(MySQLTables)

	if err != nil {
		return nil, err
	}

	var tables []string

	for _, row := range res.Rows {
		tables = append(tables, row[0].(string))
	}

	return tables, nil
}

//Table will return coulmns of a table
func (client *Client) Table(table string) (*Result, error) {
	return client.Query(fmt.Sprintf(MySQLTable, table))
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
