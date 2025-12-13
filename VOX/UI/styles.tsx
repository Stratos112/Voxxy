/**
 * style css page for Voxxy app 
 * by @author Sky Vercauteren 
 * August 2025
**/

import {StyleSheet, Dimensions} from 'react-native';

const {width, height} = Dimensions.get('window');
export const pitchBoxHeight = height - (height/3)
export const heightRange = pitchBoxHeight - 7;
export const pitchBoxWidth = width - 20;

const headColor = '#fa54ecff';
const tailColor = '#ffffff';
const targetColor = '#00d460ff';
const gridColor = '#494949ff';
const textColor = '#fdfdfdff';

// We export the styles so they can be imported and used in other files.
const styles = StyleSheet.create({


  //-------------
  // Containers
  //------------
  form: {
    padding: 20,
  },
  pitchmatchContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: '#16083dff',
  },
  pitchBox: {
    width: pitchBoxWidth,
    height: pitchBoxHeight,
    marginHorizontal: 10,
    borderColor: "#84d3ebff",
    borderWidth: 1,
    marginTop: 0,
    flexDirection:'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor : 'black',
  },
  intervalContainer: {
    flex: 1,
    backgroundColor: '#282c2eff',
  },
  sequenceContainer: {
    flex: 1,
    backgroundColor: '#411414ff',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#2cf7baff',
  },
  mainContent: {
    flex:1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: '#222924d0',
    position:'absolute',
    height:height,
    width:width
  },
  dividerBox: {
    flexDirection: 'column',
    padding:10,
    margin: 10,
    borderWidth:1,
    borderColor:'#b6afafff'
  },



  //-------------
  // Inputs
  // ------------
  dropdown:{
    width:width/2,
    padding: 10,
    zIndex:1,
  },
  input: {
    height: 40,
    width: width/2,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 5,
    color: textColor,
    backgroundColor:'#1515167c'
  },
  controls: {
    flexDirection: 'row',
    marginTop: 5,
  },
  button: {
    width: '80%',
    backgroundColor: '#04756cff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center', // This centers the text horizontally inside the button
    margin: 12,
  },
  backButton: {
    justifyContent:'flex-start',
    marginTop: 45,
    marginLeft: 10,
    padding: 10,
    backgroundColor: '#53f396ff',
    borderRadius: 8,
  },
  settingsButton: {
    justifyContent:'flex-end',
    marginTop: 45,
    marginLeft: pitchBoxWidth - 50,
    padding: 10,
    width:'10%',
    height:'40%',
    borderRadius: 8,
  },


  //------------
  // text
  //------------
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: textColor,
  },
  targetText: {
    marginLeft:150, 
    color: targetColor,
    position: 'absolute'
  },
  titleText: {
    fontSize: 30,
    marginLeft:10,
    fontWeight: '600',
    color: textColor,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 20,
    marginLeft:10,
    fontWeight: '600',
    color: textColor,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: textColor,
  },
  backButtonText: {
    color: '#000000ff',
    fontSize: 16,
  },
  

  //---------------
  // MISC
  // -------------
  targetLine: {
    height: 5, 
    backgroundColor: targetColor, 
    width: '50%', 
    marginLeft:150, 
    position: 'absolute'
  },
  pitchGrid: {
    height: 1, 
    backgroundColor: gridColor, 
    width: '100%', 
    position: 'absolute'
  },
  pitchSquare: {
    width: 7,
    height: 7,
    marginLeft: 0,
    backgroundColor: headColor,
    position: 'absolute',
  },
  pitchTail: {
    width: 5,
    height: 5,
    marginLeft: 0,
    backgroundColor: tailColor,
    position: 'absolute',
  },
});

export default styles;