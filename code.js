// debugWindow = open( '', "secondWindow", "scrollbars=yes");

var theLayout;

//-----------------------------------------------------------------------------
//   Chromosome class
//-----------------------------------------------------------------------------

//
// This method calculates the fitness of the chromosome.
//
function calculateFitnessChrom()
{
  var gaps = new Array(); // to keep the amount of gaps in the layout

  var filledCols= new Array (theLayout.numCols); //to keep how filled is each column
  for (var i = 0 ; i < theLayout.numCols ; i++)
    filledCols[i] = 0;

  for ( var i = 0; i < this.adn.length; i++ ) {

    // select the column to place the layer. If the layer spans in more than
    // one column, the selected column will be the first column the layers uses

    var selCol = 0;    // column to allocate the layer
    var selMean = 0;   // used capacity mean
    var selStd = 0;    // used capacity standard deviation
    for (var k=0 ; k < theLayout.widths[this.adn[i]] ; k++) {
      selMean += filledCols[k];
    }
    selMean /= theLayout.widths[this.adn[i]];

    for (var k=0 ; k < theLayout.widths[this.adn[i]] ; k++) {
      selStd += Math.abs(filledCols[k]-selMean);
    }
    selStd /= theLayout.widths[this.adn[i]];
    
    var limit = theLayout.numCols - theLayout.widths[this.adn[i]]+1;
    for ( var j = 1 ; j < limit ; j++) {

      var mean = 0;
      var std = 0;

      if (theLayout.widths[this.adn[i]] > 1) {
        for (var k=j ; k < j+theLayout.widths[this.adn[i]] ; k++) {
          mean += filledCols[k];
        }
        mean /= theLayout.widths[this.adn[i]];

        for (var k=j ; k < j+theLayout.widths[this.adn[i]] ; k++) {
          std += Math.abs(filledCols[k]-mean);
        }
        std /= theLayout.widths[this.adn[i]];
      }
      else {
        mean = filledCols[j];
      }

      if (std < selStd || (std == selStd && mean < selMean)) {
        selCol = j;
        selMean = mean;
        selStd = std;
      }
    }

    // once the column is chosen, if the layer spans more than one column,
    // the maximum used capacity is used
    var max = filledCols[selCol];
    if (theLayout.widths[this.adn[i]] > 1) {
      for (var k=selCol ; k < selCol+theLayout.widths[this.adn[i]] ; k++) {
        if ( filledCols[k] > filledCols[selCol] ) {
          max = filledCols[k];
        }
      }

      // detect gaps
      for (var k=selCol ; k < selCol+theLayout.widths[this.adn[i]] ; k++) {
        if (max > filledCols[k])
          gaps.push (max - filledCols[k]);
      }
    }

    // fill the column selected with the height of the layer
    for (var k=selCol ; k < selCol+theLayout.widths[this.adn[i]] ; k++) {
      filledCols[k] = max + theLayout.layers[this.adn[i]].clip.height +
                      theLayout.pixelsGap;
    }
  }

  // this part calculates the gaps at the bottom
  var max = filledCols[0];
  for ( var j = 1 ; j < theLayout.numCols ; j++) {
    if (filledCols[j] > max)
      max = filledCols[j];
  }

  for ( var j = 0 ; j < theLayout.numCols ; j++) {
    if (filledCols[j] < max)
      gaps.push (max - filledCols[j]);
  }


  // this part tries to minimize the gaps

  // If there were only one gap, the standard deviation would be 0,
  // so I insert a ficticious gap to avoid this problem
  gaps.push (0);

  var gapsMean = 0;   // gap size mean
  if (gaps.length>0) {
    for (var k=0 ; k < gaps.length ; k++) {
      gapsMean += gaps[k];
    }
    gapsMean /= gaps.length;

  }

  this.fitness = gapsMean;

  return this.fitness;
}


//
// This method mutates a chromosome.
//
function mutateChrom( )
{
  var adn = this.adn;
  var length = adn.length;
  var p1;
  var p2;

  do {
    p1 = Math.floor(Math.random()*length);
    p2 = Math.floor(Math.random()*length);
  } while (p1 == p2); 

  var aux = this.adn[p2];
  this.adn[p2] = this.adn[p1];
  this.adn[p1] = aux;
}

//
// Returns a clone of the chromosome.
// @return  The new clone.
//
function cloneChrom()
{
  var newChromosome = new Chromosome( this.adn.length );

  for (var i=0 ; i < this.adn.length ; i++) {
    newChromosome.adn[i] = this.adn[i];
  }

  return newChromosome;
}

//
// Kills a chromosome.
//
function killChrom()
{
  for (var i=0 ; i<this.adn.length ; i++) {
    this.adn[i]=null;
  }

  this.adn = null;
}

//
// Constructs a chromosome.
// @param size  Number of genes in the chromosome.
//
function Chromosome(size)
{
  this.adn= new Array (size);
  for ( var i = 0; i < size; i ++ ) {
    this.adn[i] = i;
  }

  this.calculateFitness = calculateFitnessChrom;
  this.mutate= mutateChrom;
  this.clone = cloneChrom;
  this.kill = killChrom;
}


//-----------------------------------------------------------------------------
//   Layout class
//-----------------------------------------------------------------------------

//
// This method runs the optimization process.
// @param controlPanel  The control panel.
// @param numIt         Number of iterations
// @param k             Number of iterations to reach the thermal equilibrium
//                      for a temperature
// @param language      Used language for output information.
//
function optimizeLayout(controlPanel, numIt, k, language)
{
  this.numCols = Math.floor(this.frame.innerWidth/this.pixelsCol);
  this.numLayers = this.layers.length;

  // calculates the width in columns of every layer
  this.widths = new Array(this.numLayers);

  for (var i=0 ; i<this.numLayers ; i++) {
    this.widths[i] = parseInt((this.layers[i].clip.width/this.pixelsCol)+0.5);
  }

  

  theLayout = this;

  if (theLayout.numLayers<2) {
    if (language=="spanish")
      alert("Para optimizar debe haber al menos 2 noticias");
    else
      alert("There must be two or more news to optimize");

    return;
  }

  var numIterations = parseInt(numIt);

  if ( numIterations <=0  ) {
    if (language=="spanish")
      alert("Numero de iteraciones incorrecto");
    else
      alert("Incorrect number of iterations");
  } else {

    var initTemp = -(10/Math.log(0.8));
    var minTemp = initTemp / (numIterations + 1);

    // Create the initial solution
    this.solution = new Chromosome (this.numLayers);

    // Eval the solution
    this.solution.calculateFitness();

    var timeBefore=(new Date()).getTime();
    var t = initTemp;
    var n=0;
    if (controlPanel!=null) {
      controlPanel.document.forms[0].it.value = n;
    }

    do {
      for (j=0 ; j<k ; j++) {
        var opt = this.solution.clone();
        opt.mutate();
        opt.calculateFitness();

        var delta = opt.fitness - this.solution.fitness;
        if (delta<0 || Math.random() < Math.exp(-(delta/t))) {
          this.solution.kill();
          this.solution = opt.clone();
          this.solution.fitness = opt.fitness;
        }
        opt.kill();
        opt = null;
      }
      t = initTemp / (n + 1);
      n++;

      if (controlPanel!=null) {
        controlPanel.document.forms[0].it.value = n;
      }

    }while (t>=minTemp);

    var timeAfter=(new Date()).getTime();
    if (controlPanel!=null) {
      controlPanel.document.forms[0].time.value = (timeAfter-timeBefore)/1000;
      controlPanel.document.forms[0].fitness.value = this.solution.fitness;
    }
    this.paint(this.solution);
  }
}

//
// This method paints the layout.
// @param chrom  The chromosome encoding the layout
//
function paintLayout(chrom)
{
  var filledCols= new Array (this.numCols); //to keep how filled is each column
  for (var i = 0 ; i < this.numCols ; i++)
    filledCols[i] = 0;

  for ( var i = 0; i < chrom.adn.length; i++ ) {

    // select the column to place the layer. If the layer spans in more than
    // one column, the selected column will be the first column the layers uses

    var selCol = 0;    // column to allocate the layer
    var selMean = 0;   // used capacity mean
    var selStd = 0;    // used capacity standard deviation
    for (var k=0 ; k < this.widths[chrom.adn[i]] ; k++) {
      selMean += filledCols[k];
    }
    selMean /= this.widths[chrom.adn[i]];

    for (var k=0 ; k < this.widths[chrom.adn[i]] ; k++) {
      selStd += Math.abs(filledCols[k]-selMean);
    }
    selStd /= this.widths[chrom.adn[i]];
    
    var limit = this.numCols - this.widths[chrom.adn[i]]+1;
    for ( var j = 1 ; j < limit ; j++) {

      var mean = 0;
      var std = 0;

      if (this.widths[chrom.adn[i]] > 1) {
        for (var k=j ; k < j+this.widths[chrom.adn[i]] ; k++) {
          mean += filledCols[k];
        }
        mean /= this.widths[chrom.adn[i]];

        for (var k=j ; k < j+this.widths[chrom.adn[i]] ; k++) {
          std += Math.abs(filledCols[k]-mean);
        }
        std /= this.widths[chrom.adn[i]];
      }
      else {
        mean = filledCols[j];
      }

      if (std < selStd || (std == selStd && mean < selMean)) {
        selCol = j;
        selMean = mean;
        selStd = std;
      }
    }

    // once the column is chosen, if the layer spans more than one column,
    // the maximum used capacity is used
    var max = filledCols[selCol];
    if (this.widths[chrom.adn[i]] > 1) {
      for (var k=selCol ; k < selCol+this.widths[chrom.adn[i]] ; k++) {
        if ( filledCols[k] > filledCols[selCol] ) {
          max = filledCols[k];
        }
      }
    }

    // move the layer to the right position
    this.layers[chrom.adn[i]].moveTo( selCol*this.pixelsCol,
                                      max);

    // fill the column selected with the height of the layer
    for (var k=selCol ; k < selCol+this.widths[chrom.adn[i]] ; k++) {
      filledCols[k] = max + this.layers[chrom.adn[i]].clip.height +
                      this.pixelsGap;
    }
  }
}

//
// Constructs all the necesary structures to perform the optimization.
// @param layersFrame  The frame containing the layers to optimize.
// @param pixelsCol width of a column in pixels
// @param pixelsGap size of gap between layers
//
function Layout (layersFrame, pixelsCol, pixelsGap)
{
  this.frame = layersFrame;
  this.layers = this.frame.document.layers;
  this.numLayers = this.layers.length;
  this.pixelsCol = pixelsCol;
  this.pixelsGap = pixelsGap;
  this.numCols = Math.floor(this.frame.innerWidth/this.pixelsCol);
  this.numGen = 0;

  this.optimize = optimizeLayout;
  this.paint = paintLayout;
}
