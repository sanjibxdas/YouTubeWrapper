// Generates YouTubeWrapper.xcodeproj. Run: node tools/gen_project.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROJ = path.join(ROOT, 'YouTubeWrapper.xcodeproj');
const NAME = 'YouTubeWrapper';

const id = (n) => 'AA0000000000000000000' + String(n).padStart(3, '0');

const sources = ['AppDelegate.swift', 'RootViewController.swift', 'WebViewFactory.swift', 'Settings.swift'];
const resources = ['background-play.js', 'adblock-safe.js', 'adblock-aggressive.js', 'blocklist.json',
                   'LaunchScreen.storyboard'];

const ID = {
  project: id(1), mainGroup: id(2), productsGroup: id(3), wrapperGroup: id(4),
  sourcesGroup: id(5), resourcesGroup: id(6), target: id(7), productFile: id(8),
  projConfigList: id(9), targetConfigList: id(10),
  projDebug: id(11), projRelease: id(12), targetDebug: id(13), targetRelease: id(14),
  sourcesPhase: id(15), frameworksPhase: id(16), resourcesPhase: id(17),
};

let n = 40;
const sourceFiles = sources.map((f) => ({ name: f, ref: id(n++), build: id(n++) }));
const resourceFiles = resources.map((f) => ({ name: f, ref: id(n++), build: id(n++) }));

const q = (s) => '"' + s + '"';

function fileRefs() {
  const lines = [];
  for (const f of sourceFiles) {
    lines.push(`\t\t${f.ref} = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${q(f.name)}; sourceTree = "<group>"; };`);
  }
  for (const f of resourceFiles) {
    let type = 'text.json';
    if (f.name.endsWith('.js')) type = 'sourcecode.javascript';
    if (f.name.endsWith('.storyboard')) type = 'file.storyboard';
    lines.push(`\t\t${f.ref} = {isa = PBXFileReference; lastKnownFileType = ${type}; path = ${q(f.name)}; sourceTree = "<group>"; };`);
  }
  lines.push(`\t\t${ID.productFile} = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ${NAME}.app; sourceTree = BUILT_PRODUCTS_DIR; };`);
  return lines.join('\n');
}

function buildFiles() {
  const lines = [];
  for (const f of sourceFiles) {
    lines.push(`\t\t${f.build} = {isa = PBXBuildFile; fileRef = ${f.ref}; };`);
  }
  for (const f of resourceFiles) {
    lines.push(`\t\t${f.build} = {isa = PBXBuildFile; fileRef = ${f.ref}; };`);
  }
  return lines.join('\n');
}

const pbxproj = `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 54;
	objects = {

/* Begin PBXBuildFile section */
${buildFiles()}
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
${fileRefs()}
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		${ID.frameworksPhase} = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		${ID.mainGroup} = {
			isa = PBXGroup;
			children = (
				${ID.wrapperGroup},
				${ID.productsGroup},
			);
			sourceTree = "<group>";
		};
		${ID.productsGroup} = {
			isa = PBXGroup;
			children = (
				${ID.productFile},
			);
			name = Products;
			sourceTree = "<group>";
		};
		${ID.wrapperGroup} = {
			isa = PBXGroup;
			children = (
				${ID.sourcesGroup},
				${ID.resourcesGroup},
			);
			path = YouTubeWrapper;
			sourceTree = "<group>";
		};
		${ID.sourcesGroup} = {
			isa = PBXGroup;
			children = (
${sourceFiles.map((f) => `\t\t\t\t${f.ref},`).join('\n')}
			);
			path = Sources;
			sourceTree = "<group>";
		};
		${ID.resourcesGroup} = {
			isa = PBXGroup;
			children = (
${resourceFiles.map((f) => `\t\t\t\t${f.ref},`).join('\n')}
			);
			path = Resources;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		${ID.target} = {
			isa = PBXNativeTarget;
			buildConfigurationList = ${ID.targetConfigList};
			buildPhases = (
				${ID.sourcesPhase},
				${ID.frameworksPhase},
				${ID.resourcesPhase},
			);
			buildRules = (
			);
			dependencies = (
			);
			name = ${NAME};
			productName = ${NAME};
			productReference = ${ID.productFile};
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		${ID.project} = {
			isa = PBXProject;
			attributes = {
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1500;
				LastUpgradeCheck = 1500;
				TargetAttributes = {
					${ID.target} = {
						CreatedOnToolsVersion = 15.0;
					};
				};
			};
			buildConfigurationList = ${ID.projConfigList};
			compatibilityVersion = "Xcode 12.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = ${ID.mainGroup};
			productRefGroup = ${ID.productsGroup};
			projectDirPath = "";
			projectRoot = "";
			targets = (
				${ID.target},
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		${ID.resourcesPhase} = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
${resourceFiles.map((f) => `\t\t\t\t${f.build},`).join('\n')}
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		${ID.sourcesPhase} = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
${sourceFiles.map((f) => `\t\t\t\t${f.build},`).join('\n')}
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		${ID.projDebug} = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				ENABLE_TESTABILITY = YES;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_OPTIMIZATION_LEVEL = 0;
				GCC_PREPROCESSOR_DEFINITIONS = (
					"DEBUG=1",
					"$(inherited)",
				);
				IPHONEOS_DEPLOYMENT_TARGET = 12.0;
				ONLY_ACTIVE_ARCH = YES;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
				SWIFT_VERSION = 5.0;
			};
			name = Debug;
		};
		${ID.projRelease} = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				ENABLE_NS_ASSERTIONS = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				GCC_NO_COMMON_BLOCKS = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 12.0;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				SWIFT_OPTIMIZATION_LEVEL = "-O";
				SWIFT_VERSION = 5.0;
				VALIDATE_PRODUCT = YES;
			};
			name = Release;
		};
		${ID.targetDebug} = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = "";
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				INFOPLIST_FILE = YouTubeWrapper/Resources/Info.plist;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = com.example.youtubewrapper;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		${ID.targetRelease} = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = "";
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				INFOPLIST_FILE = YouTubeWrapper/Resources/Info.plist;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = com.example.youtubewrapper;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		${ID.projConfigList} = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${ID.projDebug},
				${ID.projRelease},
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		${ID.targetConfigList} = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${ID.targetDebug},
				${ID.targetRelease},
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = ${ID.project};
}
`;

fs.mkdirSync(path.join(PROJ, 'project.xcworkspace'), { recursive: true });
fs.writeFileSync(path.join(PROJ, 'project.pbxproj'), pbxproj);

const scheme = `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion = "1500" version = "1.7">
   <BuildAction parallelizeBuildables = "YES" buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry buildForTesting = "YES" buildForRunning = "YES" buildForProfiling = "YES" buildForArchiving = "YES" buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "${ID.target}"
               BuildableName = "${NAME}.app"
               BlueprintName = "${NAME}"
               ReferencedContainer = "container:${NAME}.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <LaunchAction buildConfiguration = "Debug" selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle = "0" useCustomWorkingDirectory = "NO" ignoresPersistentStateOnLaunch = "NO" debugDocumentVersioning = "YES" debugServiceExtension = "internal" allowLocationSimulation = "YES">
      <BuildableProductRunnable runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "${ID.target}"
            BuildableName = "${NAME}.app"
            BlueprintName = "${NAME}"
            ReferencedContainer = "container:${NAME}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction buildConfiguration = "Release" shouldUseLaunchSchemeArgsEnv = "YES" savedToolIdentifier = "" useCustomWorkingDirectory = "NO" debugDocumentVersioning = "YES">
      <BuildableProductRunnable runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "${ID.target}"
            BuildableName = "${NAME}.app"
            BlueprintName = "${NAME}"
            ReferencedContainer = "container:${NAME}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction buildConfiguration = "Debug"></AnalyzeAction>
   <ArchiveAction buildConfiguration = "Release" revealArchiveInOrganizer = "YES"></ArchiveAction>
</Scheme>
`;
fs.mkdirSync(path.join(PROJ, 'xcshareddata', 'xcschemes'), { recursive: true });
fs.writeFileSync(path.join(PROJ, 'xcshareddata', 'xcschemes', `${NAME}.xcscheme`), scheme);

fs.writeFileSync(path.join(PROJ, 'project.xcworkspace', 'contents.xcworkspacedata'),
`<?xml version="1.0" encoding="UTF-8"?>
<Workspace version = "1.0">
   <FileRef location = "self:">
   </FileRef>
</Workspace>
`);

console.log('generated', PROJ);
