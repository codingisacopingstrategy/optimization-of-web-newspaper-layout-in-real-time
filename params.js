// This function get the parameters in the query part of the calling URL for
// this page and creates in the document object an array called params to
// keep inside the names and values of the parameters.

function getParameters()
{
  // add thr property params to document
  document.params = new Array(0);

  var url = new String(window.location.search);
  var beginParams = 0;

  while (beginParams<url.length)
  {
    var equalIndex = url.indexOf("=",beginParams);
    if (equalIndex>0)
    {
      var name = url.substring(beginParams+1,equalIndex);
      var beginParams = url.indexOf("&",equalIndex);
      if (beginParams<0)
        beginParams = url.length;
      var value = url.substring(equalIndex+1,beginParams);

      document.params.push(name);
      document.params[name]=value;
    }
    else
      beginParams = url.length;
  }
}
