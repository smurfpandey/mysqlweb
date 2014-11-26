package main

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

//Mime types for different files
var MimeTypes = map[string]string{
	".css":  "text/css",
	".js":   "application/javascript",
	".icon": "image-x-icon",
}

//Error struct
type Error struct {
	Message string `json:"error"`
}

//NewError creates new Error struct from go's error
func NewError(err error) Error {
	return Error{err.Error()}
}

func assetContentType(name string) string {
	mime := MimeTypes[filepath.Ext(name)]

	if mime != "" {
		return mime
	}

	return "text/plain"
}

//APIHome load home page
func APIHome(c *gin.Context) {
	data, err := Asset("static/index.html")

	if err != nil {
		c.String(400, err.Error())
		return
	}

	c.Data(200, "text/html; charset=utf-8", data)
}

//APIConnect will connect to our mysql database
func APIConnect(c *gin.Context) {
	url := c.Request.FormValue("url")

	if url == "" {
		c.JSON(400, Error{"Url parameter is required"})
		return
	}

	client, err := NewClientFromURL(url)
	if err != nil {
		c.JSON(400, Error{err.Error()})
		return
	}

	err = client.Test()
	if err != nil {
		c.JSON(400, Error{err.Error()})
		return
	}

	info, err := client.Info()

	if err == nil {
		if dbClient != nil {
			dbClient.db.Close()
		}

		dbClient = client
	}

	c.JSON(200, info.Format()[0])
}

//APIGetDatabases will get you all databases in system
func APIGetDatabases(c *gin.Context) {
	names, err := dbClient.Databases()

	if err != nil {
		c.JSON(400, NewError(err))
		return
	}

	c.JSON(200, names)
}

//APIGetDatabaseTables will give the tables of a database
func APIGetDatabaseTables(c *gin.Context) {
	res, err := dbClient.DatabaseTables(c.Params.ByName("database"))

	if err != nil {
		c.JSON(400, NewError(err))
		return
	}

	c.JSON(200, res)
}

//APIRunQuery will run the user's sql query
func APIRunQuery(c *gin.Context) {
	query := strings.TrimSpace(c.Request.FormValue("query"))

	if query == "" {
		c.JSON(400, errors.New("Query parameter is missing"))
		return
	}

	APIHandleQuery(query, c)
}

//APIExplainQuery will run explain on the sql query and return the output
func APIExplainQuery(c *gin.Context) {
	query := strings.TrimSpace(c.Request.FormValue("query"))

	if query == "" {
		c.JSON(400, errors.New("Query parameter is missing"))
		return
	}

	APIHandleQuery(fmt.Sprintf("EXPLAIN %s", query), c)
}

//APIGetTables will fetch the tables in our
func APIGetTables(c *gin.Context) {
	names, err := dbClient.Tables()

	if err != nil {
		c.JSON(400, NewError(err))
		return
	}

	c.JSON(200, names)
}

//APIGetTable get a single table
func APIGetTable(c *gin.Context) {
	res, err := dbClient.Table(c.Params.ByName("table"))

	if err != nil {
		c.JSON(400, NewError(err))
		return
	}

	c.JSON(200, res)
}

//APIGetTableInfo returns info about table like row_count, data size etc.
func APIGetTableInfo(c *gin.Context) {
	res, err := dbClient.TableInfo(c.Params.ByName("table"))

	if err != nil {
		c.JSON(400, NewError(err))
		return
	}

	c.JSON(200, res.Format()[0])
}

//APIHistory will return query history of current dbClient
func APIHistory(c *gin.Context) {
	c.JSON(200, dbClient.history)
}

//APIInfo returns information about the current db connecction
func APIInfo(c *gin.Context) {
	if dbClient == nil {
		c.JSON(400, Error{"Not connected"})
		return
	}

	res, err := dbClient.Info()

	if err != nil {
		c.JSON(400, NewError(err))
		return
	}

	c.JSON(200, res.Format()[0])
}

//APITableIndexes returns the indexs of a table
func APITableIndexes(c *gin.Context) {
	res, err := dbClient.TableIndexes(c.Params.ByName("table"))

	if err != nil {
		c.JSON(400, NewError(err))
		return
	}

	c.JSON(200, res)
}

//APIHandleQuery handles thq query and return the resultset as JSON
func APIHandleQuery(query string, c *gin.Context) {
	result, err := dbClient.Query(query)

	if err != nil {
		c.JSON(400, NewError(err))
		return
	}

	q := c.Request.URL.Query()

	if len(q["format"]) > 0 {
		if q["format"][0] == "csv" {
			c.Data(200, "text/csv", result.CSV())
			return
		}
	}

	c.JSON(200, result)
}

//APIServeAsset serves the static assets
func APIServeAsset(c *gin.Context) {
	file := fmt.Sprintf(
		"static/%s/%s",
		c.Params.ByName("type"),
		c.Params.ByName("name"),
	)

	data, err := Asset(file)

	if err != nil {
		c.String(400, err.Error())
		return
	}

	if len(data) == 0 {
		c.String(404, "Asset is empty")
		return
	}

	c.Data(200, assetContentType(file), data)
}
