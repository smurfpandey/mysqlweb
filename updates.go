package main

import (
	"time"
	"strings"
	"github.com/octokit/go-octokit/octokit"
)

type Update struct {
	Version     string     `json:"version,omitempty"`
	ReleaseURL  string     `json:"release_url,omitempty"`
	Name        string     `json:"name"`
	PreRelease  bool       `json:"is_prerelease"`
	PublishedAt *time.Time `json:"published_at"`
	Body        string     `json:"description"`
}

func checkForUpdate(currVer string) *Update {
	githubClient := octokit.NewClient(nil)
	releaseURL, err := octokit.ReleasesURL.Expand(octokit.M{"owner": "smurfpandey", "repo": "mysqlweb"})

	if err != nil {
		return nil
	}

	releases, result := githubClient.Releases(releaseURL).All()
	if result.HasError() {
		return nil
	}

		
	latestRelease := releases[0]

	latestVersion := latestRelease.TagName	 

	if strings.HasPrefix(latestVersion, "v") {
		//Remove v then compare
		latestVersion = strings.Replace(latestVersion, "v", "", 1)
	}

	isNew := compareVersion(currVer, latestVersion)

		
	if isNew == 0 || isNew == -1 {
		return nil
	}

	//We got a new release
	//Better inform the user

	//But let's make sure its not a Draft
	if latestRelease.Draft {
		return nil
	}

	update := Update{
		Version:     latestRelease.TagName,
		ReleaseURL:  latestRelease.HTMLURL,
		Name:        latestRelease.Name,
		PreRelease:  latestRelease.Prerelease,
		PublishedAt: latestRelease.PublishedAt,
		Body:        latestRelease.Body,
	}

	return &update

}
