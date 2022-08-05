import got from 'got';
import { XMLParser } from 'fast-xml-parser';

const latestRelease = (coordinates, previous = false) => {
  return new Promise((resolve, reject) => {
    if (!coordinates || !coordinates.groupId || !coordinates.artifactId) {
      reject(new Error('No Coordinates provided.'));
      return;
    }

    const path = `${coordinates.groupId.replaceAll('.', '/')}/${coordinates.artifactId}`;

    try {
      got.get(`https://repo1.maven.org/maven2/${path}/maven-metadata.xml`, { responseType: 'text', resolveBodyOnly: true }).then((body) => {
        try {
          const parser = new XMLParser({
            ignoreAttributes: true,
            ignoreDeclaration: true,
          });
          const data = parser.parse(body);
          const metadata = {
            ...coordinates,
            version: data.metadata.versioning.latest,
          };
          if (previous) {
            metadata.versions = data.metadata.versioning.versions;
          }

          resolve(metadata);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error.response ? new Error(error.response.body) : error);
    }
  });
};

const MavenUtils = {
  latestRelease,

}

export default MavenUtils;
