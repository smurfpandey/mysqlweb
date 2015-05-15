package main

import (
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"os/user"
	"strings"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/jessevdk/go-flags"
)

//Current version of the app
const VERSION = "0.7.1"

var options struct {
	Version  bool   `short:"v" long:"version" description:"Print version"`
	Debug    bool   `short:"d" long:"debug" description:"Enable debugging mode" default:"false"`
	Url      string `long:"url" description:"Database connection string"`
	Host     string `long:"host" description:"Server hostname or IP"`
	Port     int    `long:"port" description:"Server port" default:"5432"`
	User     string `long:"user" description:"Database user"`
	Pass     string `long:"pass" description:"Password for user"`
	DbName   string `long:"db" description:"Database name"`
	Ssl      string `long:"ssl" description:"SSL option"`
	HttpHost string `long:"bind" description:"HTTP server host" default:"localhost"`
	HttpPort uint   `long:"listen" description:"HTTP server listen port" default:"8080"`
	AuthUser string `long:"auth-user" description:"HTTP basic auth user"`
	AuthPass string `long:"auth-pass" description:"HTTP basic auth password"`
	SkipOpen bool   `short:"s" long:"skip-open" description:"Skip browser open on start"`
}

//var dbClient *Client
var dbClientMap map[string]*Client
var dbConnArr []Connection

func exitWithMessage(message string) {
	fmt.Println("Error:", message)
	os.Exit(1)
}

func getConnectionString() string {
	if options.Url != "" {
		url := options.Url

		if strings.Contains(url, "postgresql://") {
			fmt.Println("Invalid URL format. It should match: postgres://user:password@host:port/db?sslmode=mode")
			os.Exit(1)
		}

		// Append sslmode parameter only if its defined as a flag and not present
		// in the connection string.
		if options.Ssl != "" && !strings.Contains(url, "sslmode") {
			url += fmt.Sprintf("?sslmode=%s", options.Ssl)
		}

		return url
	}

	// Try to detect user from current OS user
	if options.User == "" {
		user, err := user.Current()

		if err == nil {
			options.User = user.Username
		}
	}

	str := fmt.Sprintf(
		"host=%s port=%d user=%s dbname=%s",
		options.Host, options.Port,
		options.User, options.DbName,
	)

	if options.Ssl == "" {
		// Disable ssl for localhost connections, most users have it disabled
		if options.Host == "localhost" || options.Host == "127.0.0.1" {
			options.Ssl = "disable"
		}
	}

	if options.Ssl != "" {
		str += fmt.Sprintf(" sslmode=%s", options.Ssl)
	}

	if options.Pass != "" {
		str += fmt.Sprintf(" password=%s", options.Pass)
	}

	return str
}

func connectionSettingsBlank() bool {
	return options.Host == "" &&
		options.User == "" &&
		options.DbName == "" &&
		options.Url == ""
}

func initClient() {
	if connectionSettingsBlank() {
		return
	}
	url := getConnectionString()
	clientKey, err := NewClientFromURL(url)
	if err != nil {
		exitWithMessage(err.Error())
	}

	fmt.Println("Connecting to server...")
	client := dbClientMap[clientKey]

	err = client.Test()
	if err != nil {
		exitWithMessage(err.Error())
	}

	user, host, database, port := getConnParametersFromString(url)
	dbConn := Connection{
		Host:     host,
		Port:     port,
		Username: user,
		Database: database,
		ConnID:   clientKey,
	}

	dbConnArr = append(dbConnArr, dbConn)
}

func initOptions() {
	_, err := flags.ParseArgs(&options, os.Args)

	if err != nil {
		os.Exit(1)
	}

	if options.Url == "" {
		options.Url = os.Getenv("DATABASE_URL")
	}

	if options.Version {
		fmt.Printf("pgweb v%s\n", VERSION)
		os.Exit(0)
	}
}

func startServer() {
	router := gin.Default()

	// Enable HTTP basic authentication only if both user and password are set
	if options.AuthUser != "" && options.AuthPass != "" {
		auth := map[string]string{options.AuthUser: options.AuthPass}
		router.Use(gin.BasicAuth(auth))
	}

	router.GET("/", APIHome)
	router.POST("/connect", APIConnect)
	router.DELETE("/disconnect", APIClose)
	router.GET("/databases", APIGetDatabases)
	router.GET("/databases/:database/tables", APIGetDatabaseTables)
	router.GET("/databases/:database/tables/:table/column", APIGetColumnOfTable)
	router.GET("/databases/:database/views", APIGetDatabaseViews)
	router.GET("/databases/:database/procedures", APIGetDatabaseProcedures)
	router.GET("/databases/:database/functions", APIGetDatabaseFunctions)
	router.POST("/databases/:database/actions/default", APISetDefaultDatabase)
	router.GET("/info", APIInfo)
	router.GET("/tables/:table/info", APIGetTableInfo)
	router.GET("/tables/:table/indexes", APITableIndexes)
	router.GET("/query", APIRunQuery)
	router.POST("/query", APIRunQuery)
	router.GET("/explain", APIExplainQuery)
	router.POST("/explain", APIExplainQuery)
	router.GET("/history", APIHistory)
	router.GET("/static/:type/:name", APIServeAsset)
	router.GET("/procedures/:procedure/parameters", APIProcedureParameters)
	router.GET("/collation", APIGetCollationCharSet)
	router.POST("/databases/:database/actions/alter", APIAlterDatabase)
	router.DELETE("/databases/:database/actions/drop", APIDropDatabase)
	router.DELETE("/databases/:database/tables/:table/actions/drop", APIDropTable)
	router.DELETE("/databases/:database/tables/:table/actions/truncate", APITruncateTable)
	router.GET("/databases/:database/procedures/:procedure", APIProcedureDefinition)
	router.GET("/databases/:database/functions/:function", APIFunctionDefinition)
	router.POST("/databases/:database/procedures/:procedure", APICreateProcedure)
	router.POST("/databases/:database/functions/:function", APICreateFunction)
	router.DELETE("/databases/:database/procedures/:procedure/actions/drop", APIDropProcedure)
	router.GET("/databases/:database/views/:view", APIViewDefinition)
	router.GET("/search/:query", apiSearch)
	router.GET("/bookmarks", APIGetBookmarks)
	router.POST("/bookmarks/:name", APISaveBookmark)
	router.DELETE("/bookmarks/:name", APIDeleteBookmark)

	fmt.Println("Starting server...")
	go router.Run(fmt.Sprintf("%v:%v", options.HttpHost, options.HttpPort))
}

func handleSignals() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, os.Kill)
	<-c
}

func openPage() {
	url := fmt.Sprintf("http://%v:%v", options.HttpHost, options.HttpPort)
	fmt.Println("To view database open", url, "in browser")

	if options.SkipOpen {
		return
	}

	_, err := exec.Command("which", "open").Output()
	if err != nil {
		return
	}

	exec.Command("open", url).Output()
}

func main() {
	initOptions()

	fmt.Println("mysqlweb version", VERSION)

	dbClientMap = make(map[string]*Client)

	initClient()

	if !options.Debug {
		gin.SetMode("release")
	}

	if options.Debug {
		go startRuntimeProfiler()
	}

	startServer()
	openPage()
	handleSignals()
}
