package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"path/filepath"

	"github.com/smurfpandey/go-homedir"
)

//Connection is a single saved connection-string object
type Connection struct {
	Name     string
	Host     string
	Port     int
	Username string
	Database string
}

type Bookmarks struct {
	Bookmarks []Connection `json:"bookmarks"`
}

func getBookmarkPath() string {
	path, _ := homedir.Dir()
	return fmt.Sprintf("%s/.mysqlweb/bookmarks.json", path)
}

func readBookmakrs(path string) (Bookmarks, error) {
	results := Bookmarks{
		Bookmarks: []Connection{},
	}

	path = filepath.FromSlash(path)

	data, err := ioutil.ReadFile(path)

	if err != nil {
		return results, err
	}

	json.Unmarshal(data, &results)

	return results, nil
}
